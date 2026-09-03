const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const requireLogin = require('../middleware/requireLogin');

// Serve student dashboard
router.get("/", requireLogin, async (req, res) => {
  try {
    const sid = req.session.userId;
    const topicsResult = await db.execute(`SELECT * FROM TOPIC`);
    const subjectsResult = await db.execute(`SELECT * FROM SUBJECT`);

    const examStats = await db.execute(
      `SELECT COUNT(*) AS CNT, NVL(ROUND(AVG(OBTAINED_MARKS), 1), 0) AS AVG_SCORE 
       FROM EXAM_PARTICIPATION WHERE STUDENT_ID = :sid`,
      { sid }
    );

    const upcomingStats = await db.execute(
      `SELECT COUNT(*) AS CNT FROM EXAM WHERE EXAM_TIME >= SYSDATE`
    );

    const assignStats = await db.execute(
      `SELECT COUNT(*) AS CNT 
       FROM ASSIGNMENT a
       WHERE a.SUBMISSION_DEADLINE >= SYSDATE
         AND NOT EXISTS (
             SELECT 1 FROM ASSIGNMENT_SUBMISSION s 
             WHERE s.ASSIGNMENT_ID = a.ASSIGNMENT_ID AND s.STUDENT_ID = :sid
         )`,
      { sid }
    );

    const questionStats = await db.execute(
      `SELECT COUNT(*) AS CNT FROM QUESTION WHERE NVL(IS_DELETED, 0) = 0`
    );

    const topicMasteryRes = await db.execute(
      `SELECT 
           NVL(q.TOPIC_NAME, 'General') AS TOPIC_NAME,
           COUNT(*) AS TOTAL_ATTEMPTED,
           SUM(CASE WHEN ea.IS_CORRECT = 1 THEN 1 ELSE 0 END) AS CORRECT_COUNT,
           ROUND((SUM(CASE WHEN ea.IS_CORRECT = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1) AS ACCURACY_PERCENT
       FROM EXAM_ANSWER ea
       JOIN QUESTION q ON ea.QUESTION_ID = q.QUESTION_ID
       WHERE ea.STUDENT_ID = :sid
       GROUP BY q.TOPIC_NAME
       ORDER BY ACCURACY_PERCENT ASC`,
      { sid }
    );

    const stats = {
      completedExams: examStats.rows && examStats.rows[0] ? (examStats.rows[0].CNT || 0) : 0,
      avgScore: examStats.rows && examStats.rows[0] ? (examStats.rows[0].AVG_SCORE || 0) : 0,
      upcomingExams: upcomingStats.rows && upcomingStats.rows[0] ? (upcomingStats.rows[0].CNT || 0) : 0,
      pendingAssignments: assignStats.rows && assignStats.rows[0] ? (assignStats.rows[0].CNT || 0) : 0,
      practiceQuestions: questionStats.rows && questionStats.rows[0] ? (questionStats.rows[0].CNT || 0) : 0
    };

    res.render('pages/Student/Dashboard', {
      topics: topicsResult.rows || [],
      subjects: subjectsResult.rows || [],
      topicMastery: topicMasteryRes.rows || [],
      stats
    });
  } catch (error) {
    console.error("Error loading student dashboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Render the login page
router.get("/login", (req, res) => {
  if (req.session && req.session.userId && req.session.userType === 'student') {
    return res.redirect('/student');
  }
  res.render("pages/Student/Login");
});

// Define a route for handling student login requests
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await db.execute(
      `SELECT STUDENT_ID, FIRST_NAME, LAST_NAME, EMAIL, PASSWORD FROM STUDENT WHERE EMAIL = :email`,
      { email: email.trim() }
    );

    if (result.rows && result.rows.length > 0) {
      const student = result.rows[0];
      const trimmedPass = password.trim();
      let isValid = false;

      try {
        isValid = await bcrypt.compare(trimmedPass, student.PASSWORD);
      } catch (e) {
        isValid = false;
      }

      // Legacy plaintext password support & transparent upgrade
      if (!isValid && student.PASSWORD === trimmedPass) {
        isValid = true;
        try {
          const newHash = await bcrypt.hash(trimmedPass, 10);
          await db.withTransaction(async (conn) => {
            await conn.execute(`UPDATE STUDENT SET PASSWORD = :newHash WHERE STUDENT_ID = :sid`, {
              newHash,
              sid: student.STUDENT_ID
            });
          });
        } catch (upgradeErr) {
          console.error("Error upgrading student password to bcrypt:", upgradeErr);
        }
      }

      if (isValid) {
        req.session.userId = student.STUDENT_ID;
        req.session.userType = 'student';
        req.session.userName = student.FIRST_NAME;

        // Log login audit
        try {
          await db.withTransaction(async (conn) => {
            await conn.execute(`INSERT INTO STUDENT_LOG (STUDENT_ID, LOGIN_TIME) VALUES (:sid, SYSDATE)`, {
              sid: student.STUDENT_ID
            });
          });
        } catch (logErr) {
          // Non-blocking log error
        }

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
          return res.status(200).json({ success: true, redirect: "/student" });
        }
        return res.redirect("/student");
      }
    }

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(401).json({ error: "Incorrect username or password" });
    }
    return res.status(401).send("<script>alert('Incorrect email or password'); window.location.href='/student/login';</script>");
  } catch (error) {
    console.error("Student login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/signup", (req, res) => {
  res.render('pages/Student/Signup');
});

// Define a route for handling signup requests
router.post("/signup", async (req, res) => {
  try {
    const { newPassword, email, firstName, lastName, userClass, age } = req.body;

    if (!newPassword || !email || !firstName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    await db.withTransaction(async (conn) => {
      await conn.execute(
        `INSERT INTO STUDENT (PASSWORD, FIRST_NAME, LAST_NAME, EMAIL, AGE, LEVEL_NAME) 
         VALUES (:hashedPassword, :firstName, :lastName, :email, :age, :userClass)`,
        {
          hashedPassword,
          firstName: firstName.trim(),
          lastName: lastName ? lastName.trim() : '',
          email: email.trim(),
          age: age ? parseInt(age, 10) : 18,
          userClass: userClass || 'Undergraduate'
        }
      );
    });

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(200).json({ message: "Signup successful" });
    }
    res.redirect('/student/login');
  } catch (error) {
    console.error("Student signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/profile", requireLogin, async (req, res) => {
  try {
    const sid = req.session.userId;
    const result = await db.execute(
      `SELECT * FROM Student WHERE student_id = :sid`,
      { sid }
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).send("Student profile not found");
    }

    res.render('pages/Student/Profile', { student: result.rows });
  } catch (error) {
    console.error("Error fetching student profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update student profile
router.post("/update-profile", requireLogin, async (req, res) => {
  try {
    const sid = req.session.userId;
    const { firstName, lastName, password } = req.body;

    if (!firstName) {
      return res.status(400).json({ error: "First name is required" });
    }

    await db.withTransaction(async (conn) => {
      if (password && password.trim().length > 0) {
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        await conn.execute(
          `UPDATE Student SET FIRST_NAME = :firstName, LAST_NAME = :lastName, PASSWORD = :hashedPassword WHERE STUDENT_ID = :sid`,
          { firstName: firstName.trim(), lastName: lastName ? lastName.trim() : '', hashedPassword, sid }
        );
      } else {
        await conn.execute(
          `UPDATE Student SET FIRST_NAME = :firstName, LAST_NAME = :lastName WHERE STUDENT_ID = :sid`,
          { firstName: firstName.trim(), lastName: lastName ? lastName.trim() : '', sid }
        );
      }
    });

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating student profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;