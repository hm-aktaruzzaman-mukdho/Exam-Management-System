const express = require('express');
const router = express.Router();
const db = require('../db');
const requireLogin = require('../middleware/requireLogin');

router.get("/", requireLogin, async (req, res) => {
    try {
        const examRes = await db.execute(`SELECT COUNT(*) AS CNT FROM EXAM`);
        const qRes = await db.execute(`SELECT COUNT(*) AS CNT FROM QUESTION WHERE NVL(IS_DELETED, 0) = 0`);
        const qsRes = await db.execute(`SELECT COUNT(*) AS CNT FROM QUESTION_SET`);
        const assignRes = await db.execute(`SELECT COUNT(*) AS CNT FROM ASSIGNMENT`);
        const pendingGradeRes = await db.execute(`SELECT COUNT(*) AS CNT FROM ASSIGNMENT_SUBMISSION WHERE MARKS_OBTAINED IS NULL`);
        const studentRes = await db.execute(`SELECT COUNT(*) AS CNT FROM STUDENT`);

        const stats = {
            totalExams: examRes.rows && examRes.rows[0] ? (examRes.rows[0].CNT || 0) : 0,
            totalQuestions: qRes.rows && qRes.rows[0] ? (qRes.rows[0].CNT || 0) : 0,
            totalQuestionSets: qsRes.rows && qsRes.rows[0] ? (qsRes.rows[0].CNT || 0) : 0,
            totalAssignments: assignRes.rows && assignRes.rows[0] ? (assignRes.rows[0].CNT || 0) : 0,
            pendingGrades: pendingGradeRes.rows && pendingGradeRes.rows[0] ? (pendingGradeRes.rows[0].CNT || 0) : 0,
            totalStudents: studentRes.rows && studentRes.rows[0] ? (studentRes.rows[0].CNT || 0) : 0
        };

        res.render('pages/Teacher/Dashboard', { stats });
    } catch (err) {
        console.error("Error loading teacher dashboard:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

const bcrypt = require('bcryptjs');

router.get("/login", (req, res) => {
    if (req.session && req.session.userId && req.session.userType === 'teacher') {
        return res.redirect('/teacher');
    }
    res.render('pages/Teacher/Login');
});

// Define a route for handling teacher login requests
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const result = await db.execute(
            `SELECT TEACHER_ID, FIRST_NAME, LAST_NAME, EMAIL, PASSWORD, IS_ADMIN, APPROVAL_STATUS FROM teacher WHERE email = :email`,
            { email: email.trim() }
        );

        if (result.rows && result.rows.length > 0) {
            const teacher = result.rows[0];
            const trimmedPass = password.trim();

            // Check if teacher is awaiting approval
            if (teacher.APPROVAL_STATUS === 0) {
                if (req.headers.accept && req.headers.accept.includes('application/json')) {
                    return res.status(403).json({ error: "Account pending administrator approval" });
                }
                return res.status(403).send("<script>alert('Your faculty account is awaiting administrator approval.'); window.location.href='/teacher/login';</script>");
            }

            let isValid = false;
            try {
                isValid = await bcrypt.compare(trimmedPass, teacher.PASSWORD);
            } catch (e) {
                isValid = false;
            }

            // Legacy plaintext fallback & automatic transparent upgrade
            if (!isValid && teacher.PASSWORD === trimmedPass) {
                isValid = true;
                try {
                    const newHash = await bcrypt.hash(trimmedPass, 10);
                    await db.withTransaction(async (conn) => {
                        await conn.execute(`UPDATE Teacher SET PASSWORD = :newHash WHERE TEACHER_ID = :tid`, {
                            newHash,
                            tid: teacher.TEACHER_ID
                        });
                    });
                } catch (upgradeErr) {
                    console.error("Error upgrading teacher password to bcrypt:", upgradeErr);
                }
            }

            if (isValid) {
                req.session.userId = teacher.TEACHER_ID;
                req.session.userType = 'teacher';
                req.session.userName = teacher.FIRST_NAME;
                req.session.isAdmin = teacher.IS_ADMIN === 1;

                // Log teacher login audit
                try {
                    await db.withTransaction(async (conn) => {
                        await conn.execute(`INSERT INTO TEACHER_LOG (TEACHER_ID, LOGIN_TIME) VALUES (:tid, SYSDATE)`, {
                            tid: teacher.TEACHER_ID
                        });
                    });
                } catch (logErr) {}

                if (req.headers.accept && req.headers.accept.includes('application/json')) {
                    return res.status(200).json({ success: true, redirect: "/teacher" });
                }
                return res.redirect("/teacher");
            }
        }

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(401).json({ error: "Incorrect username or password" });
        }
        return res.status(401).send("<script>alert('Incorrect email or password'); window.location.href='/teacher/login';</script>");
    } catch (error) {
        console.error("Teacher login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/signup", (req, res) => {
    res.render('pages/Teacher/Signup');
});

// Teacher signup route
router.post("/signup", async (req, res) => {
    try {
        const { newPassword, email, firstName, lastName } = req.body;
        if (!newPassword || !email || !firstName) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `INSERT INTO Teacher (PASSWORD, FIRST_NAME, LAST_NAME, EMAIL, APPROVAL_STATUS) 
                 VALUES (:hashedPassword, :firstName, :lastName, :email, 1)`,
                {
                    hashedPassword,
                    firstName: firstName.trim(),
                    lastName: lastName ? lastName.trim() : '',
                    email: email.trim()
                }
            );
        });

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ message: "Signup successful" });
        }
        res.redirect('/teacher/login');
    } catch (error) {
        console.error("Teacher signup error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/profile", requireLogin, async (req, res) => {
    try {
        const tid = req.session.userId;
        const teacher = await db.execute(
            `SELECT * FROM Teacher WHERE teacher_id = :tid`,
            { tid }
        );

        if (!teacher.rows || teacher.rows.length === 0) {
            return res.status(404).send("Teacher profile not found");
        }

        res.render('pages/Teacher/Profile.ejs', { user: teacher.rows });
    } catch (err) {
        console.error("Error fetching teacher profile:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/update-profile", requireLogin, async (req, res) => {
    try {
        const tid = req.session.userId;
        // Accept either direct body or credentials wrapper
        const data = req.body.credentials || req.body;
        const { firstName, lastName, password } = data;

        if (!firstName) {
            return res.status(400).json({ error: "First name is required" });
        }

        await db.withTransaction(async (conn) => {
            if (password && password.trim().length > 0) {
                const hashedPassword = await bcrypt.hash(password.trim(), 10);
                await conn.execute(
                    `UPDATE Teacher SET FIRST_NAME = :firstName, LAST_NAME = :lastName, PASSWORD = :hashedPassword WHERE TEACHER_ID = :tid`,
                    { firstName: firstName.trim(), lastName: lastName ? lastName.trim() : '', hashedPassword, tid }
                );
            } else {
                await conn.execute(
                    `UPDATE Teacher SET FIRST_NAME = :firstName, LAST_NAME = :lastName WHERE TEACHER_ID = :tid`,
                    { firstName: firstName.trim(), lastName: lastName ? lastName.trim() : '', tid }
                );
            }
        });

        res.status(200).json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error("Error updating teacher profile:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;