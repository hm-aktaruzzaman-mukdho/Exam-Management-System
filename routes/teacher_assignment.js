const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const requireLogin = require('../middleware/requireLogin');

const answerUploadDir = path.join(__dirname, '../uploads/Assignment_Answer');
const questionUploadDir = path.join(__dirname, '../uploads/Assignment_Question');

// Ensure directories exist
[answerUploadDir, questionUploadDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

router.get("/assignments", requireLogin, async (req, res) => {
    try {
        const assignmentdetails = await db.execute(`SELECT * FROM ASSIGNMENT ORDER BY ASSIGNMENT_ID DESC`);
        res.render('pages/Teacher/Assignments.ejs', { assignments: assignmentdetails.rows || [] });
    } catch (err) {
        console.error("Error fetching assignments for teacher:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/assignments/:assignmentId", requireLogin, async (req, res) => {
    try {
        const assignmentId = parseInt(req.params.assignmentId, 10);
        const assignmentdetails = await db.execute(
            `SELECT * FROM ASSIGNMENT WHERE ASSIGNMENT_ID = :aid`,
            { aid: assignmentId }
        );

        const submittedassignments = await db.execute(
            `SELECT sub.ASSIGNMENT_ID, sub.STUDENT_ID, sub.MARKS_OBTAINED, sub.FEEDBACK, sub.SUBMISSION_TIME,
                    s.FIRST_NAME, s.LAST_NAME, s.EMAIL
             FROM ASSIGNMENT_SUBMISSION sub
             JOIN STUDENT s ON (sub.STUDENT_ID = s.STUDENT_ID)
             WHERE sub.ASSIGNMENT_ID = :aid`,
            { aid: assignmentId }
        );

        res.render('pages/Teacher/Assignment_Details_T', {
            assignments: assignmentdetails.rows || [],
            submittedAssignments: submittedassignments.rows || []
        });
    } catch (err) {
        console.error("Error loading teacher assignment details:", err);
        res.status(500).send('Error rendering template');
    }
});

router.post("/assignments/:assignmentID/update", requireLogin, async (req, res) => {
    try {
        const { newDeadline, newMark } = req.body;
        const aid = parseInt(req.params.assignmentID, 10);

        if (!newDeadline && !newMark) {
            return res.status(400).json({ error: "Please enter new deadline or marks" });
        }

        await db.withTransaction(async (conn) => {
            if (newDeadline && newMark) {
                const submissionDeadlineFormatted = newDeadline.replace('T', ' ').substring(0, 16);
                await conn.execute(
                    `UPDATE ASSIGNMENT 
                     SET SUBMISSION_DEADLINE = TO_DATE(:submissionDeadlineFormatted, 'YYYY-MM-DD HH24:MI'),
                         TOTAL_MARKS = :newMark 
                     WHERE ASSIGNMENT_ID = :aid`,
                    { submissionDeadlineFormatted, newMark: parseInt(newMark, 10), aid }
                );
            } else if (newDeadline) {
                const submissionDeadlineFormatted = newDeadline.replace('T', ' ').substring(0, 16);
                await conn.execute(
                    `UPDATE ASSIGNMENT 
                     SET SUBMISSION_DEADLINE = TO_DATE(:submissionDeadlineFormatted, 'YYYY-MM-DD HH24:MI') 
                     WHERE ASSIGNMENT_ID = :aid`,
                    { submissionDeadlineFormatted, aid }
                );
            } else if (newMark) {
                await conn.execute(
                    `UPDATE ASSIGNMENT SET TOTAL_MARKS = :newMark WHERE ASSIGNMENT_ID = :aid`,
                    { newMark: parseInt(newMark, 10), aid }
                );
            }
        });

        res.status(200).json({ success: true, message: "Assignment updated successfully" });
    } catch (err) {
        console.error("Error updating assignment:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Uploading student mark
router.post("/assignments/:assignmentID/submit-mark", requireLogin, async (req, res) => {
    try {
        const aid = parseInt(req.params.assignmentID, 10);
        const studentId = parseInt(req.body.studentId, 10);
        const mark = parseFloat(req.body.mark);

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `UPDATE ASSIGNMENT_SUBMISSION SET MARKS_OBTAINED = :mark WHERE STUDENT_ID = :studentId AND ASSIGNMENT_ID = :aid`,
                { mark, studentId, aid }
            );
        });

        res.status(200).json({ message: "Mark successfully submitted" });
    } catch (err) {
        console.error("Error submitting student mark:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/assignments/:assignmentID/students/:studentID/download", requireLogin, async (req, res) => {
    try {
        const assignmentID = req.params.assignmentID;
        const studentID = req.params.studentID;
        const extensions = ['.pdf', '.doc', '.docx', '.png', '.jpg'];
        let foundPath = null;

        for (const ext of extensions) {
            const candidate = path.join(answerUploadDir, `assignment_answer_${assignmentID}_${studentID}${ext}`);
            if (fs.existsSync(candidate)) {
                foundPath = candidate;
                break;
            }
        }

        if (foundPath) {
            res.download(foundPath);
        } else {
            res.status(404).send('File not found. Maybe the student hasn\'t uploaded the answer file yet.');
        }
    } catch (err) {
        console.error("Error downloading student assignment:", err);
        res.status(500).send("Error downloading file");
    }
});

router.get("/assignments/:assignmentID/download", requireLogin, async (req, res) => {
    try {
        const assignmentID = req.params.assignmentID;
        const extensions = ['.pdf', '.doc', '.docx'];
        let foundPath = null;

        for (const ext of extensions) {
            const candidate = path.join(questionUploadDir, `assignment_questions_${assignmentID}${ext}`);
            if (fs.existsSync(candidate)) {
                foundPath = candidate;
                break;
            }
        }

        if (foundPath) {
            res.download(foundPath);
        } else {
            res.status(404).send('File not found. Maybe the teacher hasn\'t uploaded the assignment file yet.');
        }
    } catch (err) {
        console.error("Error downloading assignment question:", err);
        res.status(500).send("Error downloading file");
    }
});

router.get("/create-assignment", requireLogin, async (req, res) => {
    try {
        const academicLevels = await db.execute(`SELECT * FROM ACADEMIC_LEVEL ORDER BY LEVEL_NAME`);
        const topics = await db.execute(`SELECT TOPIC_NAME FROM TOPIC ORDER BY TOPIC_NAME`);

        res.render('pages/Teacher/Assignment_Creation', {
            topics: topics.rows || [],
            academicLevels: academicLevels.rows || []
        });
    } catch (err) {
        console.error("Error loading create-assignment page:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post('/create-assignment', requireLogin, async (req, res) => {
    try {
        const { assignmentName, topicName, levelName, assignmentDetails, submissionDeadline, totalMarks } = req.body;
        const teacher_ID = req.session.userId;
        const submissionDeadlineFormatted = (submissionDeadline || '').replace('T', ' ').substring(0, 16);

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `INSERT INTO ASSIGNMENT (ASSIGNMENT_NAME, TOPIC_NAME, LEVEL_NAME, ASSIGNMENT_DETAILS, SUBMISSION_DEADLINE, TOTAL_MARKS, TEACHER_ID) 
                 VALUES (:assignmentName, :topicName, :levelName, :assignmentDetails, TO_DATE(:submissionDeadlineFormatted, 'YYYY-MM-DD HH24:MI'), :totalMarks, :teacher_ID)`,
                {
                    assignmentName: (assignmentName || '').trim(),
                    topicName: (topicName || '').trim(),
                    levelName: (levelName || '').trim(),
                    assignmentDetails: (assignmentDetails || '').trim(),
                    submissionDeadlineFormatted,
                    totalMarks: parseInt(totalMarks || 100, 10),
                    teacher_ID
                }
            );
        });

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ message: "Assignment created successfully" });
        }
        res.redirect('/teacher/assignments');
    } catch (err) {
        console.error("Error creating assignment:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Storage for question uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, questionUploadDir);
    },
    filename: function (req, file, cb) {
        const fileName = `assignment_questions_${req.params.assignmentId}${path.extname(file.originalname) || '.pdf'}`;
        const targetPath = path.join(questionUploadDir, fileName);
        if (fs.existsSync(targetPath)) {
            try {
                fs.unlinkSync(targetPath);
            } catch (e) {
                console.error("Error unlinking old question file:", e);
            }
        }
        cb(null, fileName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 }
});

router.post('/assignments/:assignmentId/upload-question', requireLogin, upload.single('assignmentQuestionPdf'), (req, res) => {
    res.status(200).send('Assignment question uploaded successfully');
});

module.exports = router;