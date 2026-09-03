const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const requireLogin = require('../middleware/requireLogin');

const answerUploadDir = path.join(__dirname, '../uploads/Assignment_Answer');
const questionUploadDir = path.join(__dirname, '../uploads/Assignment_Question');

// Ensure upload directories exist
[answerUploadDir, questionUploadDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Route for viewing assignments
router.get('/assignments', requireLogin, async (req, res) => {
    try {
        const result = await db.execute(`SELECT * FROM ASSIGNMENT ORDER BY ASSIGNMENT_ID DESC`);
        res.render('pages/Student/Assignments', { assignments: result.rows || [] });
    } catch (err) {
        console.error("Error loading student assignments:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Route for viewing a specific assignment
router.get('/assignments/:assignmentId', requireLogin, async (req, res) => {
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const studentId = req.session.userId;
    try {
        const result = await db.execute(
            `SELECT a.*, sub.MARKS_OBTAINED, sub.MARKS_OBTAINED AS OBTAINED_MARKS, 
                    sub.FEEDBACK, sub.SUBMISSION_TIME, sub.SUBMISSION_ATTEMPT
             FROM ASSIGNMENT a
             LEFT JOIN ASSIGNMENT_SUBMISSION sub 
               ON (a.ASSIGNMENT_ID = sub.ASSIGNMENT_ID AND sub.STUDENT_ID = :studentId)
             WHERE a.ASSIGNMENT_ID = :assignmentId`,
            { assignmentId, studentId }
        );

        const assignment = result.rows && result.rows[0];
        if (!assignment) {
            return res.status(404).send('Assignment not found');
        }

        res.render('pages/Student/Assignment_Details', { assignment });
    } catch (error) {
        console.error('Error fetching assignment details:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Multer storage configuration for student answers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, answerUploadDir);
    },
    filename: function (req, file, cb) {
        const fileName = `assignment_answer_${req.params.assignmentId}_${req.session.userId}${path.extname(file.originalname) || '.pdf'}`;
        const targetPath = path.join(answerUploadDir, fileName);
        if (fs.existsSync(targetPath)) {
            try {
                fs.unlinkSync(targetPath);
            } catch (e) {
                console.error("Error unlinking old file:", e);
            }
        }
        cb(null, fileName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

router.get('/assignments/:assignment_id/submission', requireLogin, async (req, res) => {
    const assignmentId = req.params.assignment_id;
    const userId = req.session.userId;
    // Check common extensions
    const extensions = ['.pdf', '.doc', '.docx', '.png', '.jpg'];
    let foundPath = null;

    for (const ext of extensions) {
        const candidate = path.join(answerUploadDir, `assignment_answer_${assignmentId}_${userId}${ext}`);
        if (fs.existsSync(candidate)) {
            foundPath = candidate;
            break;
        }
    }

    if (foundPath) {
        return res.download(foundPath);
    } else {
        return res.status(404).send('File not found. You haven\'t uploaded any assignment answer yet.');
    }
});

router.get('/assignments/:assignment_id/download', requireLogin, async (req, res) => {
    const assignmentId = req.params.assignment_id;
    const extensions = ['.pdf', '.doc', '.docx'];
    let foundPath = null;

    for (const ext of extensions) {
        const candidate = path.join(questionUploadDir, `assignment_questions_${assignmentId}${ext}`);
        if (fs.existsSync(candidate)) {
            foundPath = candidate;
            break;
        }
    }

    if (foundPath) {
        return res.download(foundPath);
    } else {
        return res.status(404).send('File not found. Maybe the teacher hasn\'t uploaded the assignment file yet.');
    }
});

// Route to handle student file upload
router.post('/assignments/:assignmentId/upload', requireLogin, upload.single('assignmentAnswer'), async (req, res) => {
    try {
        const assignmentId = parseInt(req.params.assignmentId, 10);
        const studentId = req.session.userId;

        // Record submission in database
        await db.withTransaction(async (conn) => {
            const existing = await conn.execute(
                `SELECT 1 FROM ASSIGNMENT_SUBMISSION WHERE STUDENT_ID = :studentId AND ASSIGNMENT_ID = :assignmentId`,
                { studentId, assignmentId }
            );

            if (existing.rows && existing.rows.length > 0) {
                await conn.execute(
                    `UPDATE ASSIGNMENT_SUBMISSION 
                     SET SUBMISSION_TIME = SYSDATE, SUBMISSION_ATTEMPT = SUBMISSION_ATTEMPT + 1
                     WHERE STUDENT_ID = :studentId AND ASSIGNMENT_ID = :assignmentId`,
                    { studentId, assignmentId }
                );
            } else {
                await conn.execute(
                    `INSERT INTO ASSIGNMENT_SUBMISSION (STUDENT_ID, ASSIGNMENT_ID, SUBMISSION_TIME, SUBMISSION_ATTEMPT)
                     VALUES (:studentId, :assignmentId, SYSDATE, 1)`,
                    { studentId, assignmentId }
                );
            }
        });

        res.status(200).send('File uploaded successfully');
    } catch (err) {
        console.error("Error recording assignment upload:", err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;