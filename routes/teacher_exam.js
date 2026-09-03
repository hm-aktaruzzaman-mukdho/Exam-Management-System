const express = require('express');
const router = express.Router();
const db = require('../db');
const requireLogin = require('../middleware/requireLogin');

router.get("/exams", requireLogin, async (req, res) => {
    try {
        const examdetails = await db.execute(`SELECT * FROM EXAM ORDER BY EXAM_ID DESC`);
        res.render('pages/Teacher/Exams', { exams: examdetails.rows || [] });
    } catch (err) {
        console.error("Error fetching exams for teacher:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/exams/:examID", requireLogin, async (req, res) => {
    try {
        const examId = parseInt(req.params.examID, 10);

        // Fetch exam metadata
        const examMetaRes = await db.execute(
            `SELECT e.EXAM_ID, e.EXAM_TYPE, e.EXAM_TIME, e.EXAM_DURATION, e.LEVEL_NAME,
                    qs.QUESTION_SET_ID, qs.QUESTION_SET_NAME, qs.TOTAL_MARKS, qs.NO_OF_QUESTIONS
             FROM EXAM e
             LEFT JOIN QUESTION_SET qs ON (e.QUESTION_SET_ID = qs.QUESTION_SET_ID)
             WHERE e.EXAM_ID = :examId`,
            { examId }
        );
        const examMeta = examMetaRes.rows && examMetaRes.rows[0];

        // Fetch student submissions
        const result = await db.execute(
            `SELECT ep.EXAM_ID, ep.STUDENT_ID, ep.OBTAINED_MARKS, ep.FEEDBACK,
                    s.FIRST_NAME, s.LAST_NAME, s.EMAIL
             FROM EXAM_PARTICIPATION ep
             JOIN STUDENT s ON (ep.STUDENT_ID = s.STUDENT_ID)
             WHERE ep.EXAM_ID = :examId
             ORDER BY ep.OBTAINED_MARKS DESC`,
            { examId }
        );

        const candidates = result.rows || [];
        const totalCandidates = candidates.length;
        let avgScore = 0;
        let highScore = 0;
        let lowScore = 0;
        let passCount = 0;
        const totalMarks = examMeta && examMeta.TOTAL_MARKS ? Number(examMeta.TOTAL_MARKS) : 100;

        if (totalCandidates > 0) {
            const scores = candidates.map(c => Number(c.OBTAINED_MARKS !== undefined ? c.OBTAINED_MARKS : 0));
            highScore = Math.max(...scores);
            lowScore = Math.min(...scores);
            const sum = scores.reduce((a, b) => a + b, 0);
            avgScore = (sum / totalCandidates).toFixed(1);
            passCount = scores.filter(s => s >= totalMarks * 0.5).length;
        }

        const analytics = {
            totalCandidates,
            avgScore,
            highScore,
            lowScore,
            passCount,
            passRate: totalCandidates > 0 ? Math.round((passCount / totalCandidates) * 100) : 0,
            totalMarks
        };

        res.render('pages/Teacher/Exam_Details', {
            exams: candidates,
            examMeta,
            analytics
        });
    } catch (err) {
        console.error("Error fetching exam participation details:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Route for teacher viewing a specific student's past exam answers
router.get('/exams/past/:examId/:studentid', requireLogin, async (req, res) => {
    try {
        const examId = parseInt(req.params.examId, 10);
        const studentId = parseInt(req.params.studentid, 10);

        const answersheet = await db.execute(
            `SELECT ea.STUDENT_ID, ea.QUESTION_ID, ea.EXAM_ID, ea.GIVEN_ANSWER, ea.IS_CORRECT, ea.OBTAINED_MARKS,
                    q.QUESTION_BODY, q.TYPE_NAME, q.OPTION_1, q.OPTION_2, q.OPTION_3, q.OPTION_4, q.CORRECT_ANSWER,
                    qsq.MARK_OF_QUESTION
             FROM EXAM_ANSWER ea
             JOIN QUESTION q ON (ea.QUESTION_ID = q.QUESTION_ID)
             JOIN QUESTION_SET_QUESTION qsq ON (ea.QUESTION_ID = qsq.QUESTION_ID)
             WHERE ea.STUDENT_ID = :studentId AND ea.EXAM_ID = :examId
               AND qsq.QUESTION_SET_ID = (SELECT QUESTION_SET_ID FROM EXAM WHERE EXAM_ID = :examId)`,
            { studentId, examId }
        );

        const examdetails = await db.execute(
            `SELECT ep.STUDENT_ID, ep.EXAM_ID, ep.OBTAINED_MARKS, ep.FEEDBACK,
                    e.EXAM_TIME, e.EXAM_DURATION, e.LEVEL_NAME,
                    t.FIRST_NAME, t.LAST_NAME, t.EMAIL,
                    qs.QUESTION_SET_ID, qs.QUESTION_SET_NAME, qs.TOTAL_MARKS, qs.NO_OF_QUESTIONS
             FROM EXAM_PARTICIPATION ep
             JOIN EXAM e ON (ep.EXAM_ID = e.EXAM_ID)
             LEFT JOIN TEACHER t ON (e.SCHEDULED_BY = t.TEACHER_ID)
             LEFT JOIN QUESTION_SET qs ON (e.QUESTION_SET_ID = qs.QUESTION_SET_ID)
             WHERE ep.STUDENT_ID = :studentId AND ep.EXAM_ID = :examId`,
            { studentId, examId }
        );

        if (answersheet.rows && answersheet.rows.length > 0 && examdetails.rows && examdetails.rows.length > 0) {
            res.render('pages/Teacher/Exam_Details_Student_Past.ejs', {
                examdetail: examdetails.rows,
                examAnswers: answersheet.rows
            });
        } else {
            res.send('<script>alert("No exam details found for this student"); window.history.back();</script>');
        }
    } catch (err) {
        console.error("Error loading student past exam for teacher:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/create-exam", requireLogin, async (req, res) => {
    try {
        const academicLevels = await db.execute(`SELECT * FROM ACADEMIC_LEVEL`);
        const questionsets = await db.execute(`SELECT * FROM QUESTION_SET`);

        res.render('pages/Teacher/Exam_Creation', {
            academicLevels: academicLevels.rows || [],
            questionSets: questionsets.rows || []
        });
    } catch (err) {
        console.error("Error loading teacher create-exam page:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/create-exam", requireLogin, async (req, res) => {
    try {
        const { examName, examDate, examDuration, academicLevel, questionSet } = req.body;
        const submissionDeadlineFormatted = (examDate || '').replace('T', ' ').substring(0, 16);
        const tid = req.session.userId;
        const examtype = 'Scheduled';

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `INSERT INTO EXAM (EXAM_NAME, EXAM_TYPE, SCHEDULED_BY, QUESTION_SET_ID, EXAM_TIME, EXAM_DURATION, LEVEL_NAME)
                 VALUES (:examName, :examtype, :tid, TO_NUMBER(:questionSet), TO_DATE(:submissionDeadlineFormatted, 'YYYY-MM-DD HH24:MI'), TO_NUMBER(:examDuration), :academicLevel)`,
                {
                    examName: (examName || 'Scheduled Exam').trim(),
                    examtype,
                    tid,
                    questionSet: String(questionSet),
                    submissionDeadlineFormatted,
                    examDuration: String(examDuration || 60),
                    academicLevel
                }
            );
        });

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ message: "Exam created successfully" });
        }
        res.redirect('/teacher/exams');
    } catch (err) {
        console.error("Error creating scheduled exam:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/exams/:examID/students/:studentId/review", requireLogin, async (req, res) => {
    try {
        const examid = parseInt(req.params.examID, 10);
        const studentId = parseInt(req.params.studentId, 10);
        const review = req.body.review || '';

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `UPDATE EXAM_PARTICIPATION SET FEEDBACK = :review WHERE EXAM_ID = :examid AND STUDENT_ID = :studentId`,
                { review, examid, studentId }
            );
        });

        res.status(200).json({ success: true, message: "Review given" });
    } catch (err) {
        console.error("Error saving teacher review for exam:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;