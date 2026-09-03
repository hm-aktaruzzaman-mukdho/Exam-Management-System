const express = require('express');
const router = express.Router();
const db = require('../db');
const requireLogin = require('../middleware/requireLogin');

router.get('/exams', requireLogin, async (req, res) => {
    try {
        const result = await db.execute(`SELECT * FROM EXAM ORDER BY EXAM_ID DESC`);
        res.render('pages/Student/All_Exams.ejs', { exams: result.rows || [] });
    } catch (err) {
        console.error("Error fetching exams for student:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/exams/ongoing/:examId', requireLogin, async (req, res) => {
    try {
        const examid = parseInt(req.params.examId, 10);
        const sid = req.session.userId;

        // Check if student has already submitted
        const isanswered = await db.execute(
            `SELECT * FROM EXAM_PARTICIPATION WHERE STUDENT_ID = :sid AND EXAM_ID = :examid`,
            { sid, examid }
        );

        if (isanswered.rows && isanswered.rows.length > 0) {
            return res.redirect('/student/exams/past/' + examid);
        }

        const examquestions = await db.execute(
            `SELECT q.QUESTION_ID, q.TYPE_NAME, q.QUESTION_BODY, q.OPTION_1, q.OPTION_2, q.OPTION_3, q.OPTION_4, qsq.MARK_OF_QUESTION
             FROM QUESTION_SET_QUESTION qsq 
             JOIN QUESTION q ON (q.QUESTION_ID = qsq.QUESTION_ID)
             WHERE qsq.QUESTION_SET_ID = (SELECT QUESTION_SET_ID FROM EXAM WHERE EXAM_ID = :examid)`,
            { examid }
        );

        const examduration = await db.execute(
            `SELECT EXAM_ID, EXAM_TIME, EXAM_DURATION, LEVEL_NAME, EXAM_TYPE FROM EXAM WHERE EXAM_ID = :examid`,
            { examid }
        );

        if (!examduration.rows || examduration.rows.length === 0) {
            return res.status(404).send("Exam not found");
        }

        res.render('pages/Student/Exam_Giving.ejs', {
            questioncollections: examquestions.rows || [],
            examDurationMinutes: examduration.rows
        });
    } catch (err) {
        console.error("Error loading ongoing exam:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post('/exams/:examid/submit-exam-answer', requireLogin, async (req, res) => {
    try {
        const examid = parseInt(req.params.examid, 10);
        const sid = req.session.userId;
        const formDataArray = Array.isArray(req.body) ? req.body : [];

        await db.withTransaction(async (conn) => {
            // 1. Fetch question keys and mark allocations for this exam
            const qInfoResult = await conn.execute(
                `SELECT q.QUESTION_ID, q.CORRECT_ANSWER, NVL(qsq.MARK_OF_QUESTION, 1) AS MARK_OF_QUESTION
                 FROM QUESTION_SET_QUESTION qsq 
                 JOIN QUESTION q ON (qsq.QUESTION_ID = q.QUESTION_ID)
                 WHERE qsq.QUESTION_SET_ID = (SELECT QUESTION_SET_ID FROM EXAM WHERE EXAM_ID = :examid)`,
                { examid }
            );

            const qMap = new Map();
            (qInfoResult.rows || []).forEach(row => {
                const qId = row.QUESTION_ID !== undefined ? Number(row.QUESTION_ID) : Number(row[0]);
                const corrAns = row.CORRECT_ANSWER !== undefined ? String(row.CORRECT_ANSWER || '') : String(row[1] || '');
                const mark = row.MARK_OF_QUESTION !== undefined ? Number(row.MARK_OF_QUESTION) : Number(row[2] || 1);
                qMap.set(qId, {
                    correctAnswer: corrAns.trim().toLowerCase(),
                    mark: isNaN(mark) ? 1 : mark
                });
            });

            // Map user submissions by question ID
            const answersMap = new Map();
            for (const formData of formDataArray) {
                if (!formData.QUESTION_ID) continue;
                const questionId = parseInt(formData.QUESTION_ID, 10);
                const givenAnswer = formData.GIVEN_ANSWER !== undefined ? String(formData.GIVEN_ANSWER).trim() : '';
                answersMap.set(questionId, givenAnswer);
            }

            // 2. Record all question responses in EXAM_ANSWER
            for (const [qId] of qMap.entries()) {
                const givenAnswer = answersMap.has(qId) ? answersMap.get(qId) : '';
                await conn.execute(
                    `MERGE INTO EXAM_ANSWER ea
                     USING DUAL ON (ea.STUDENT_ID = :sid AND ea.QUESTION_ID = :qId AND ea.EXAM_ID = :examid)
                     WHEN MATCHED THEN UPDATE SET GIVEN_ANSWER = :givenAnswer
                     WHEN NOT MATCHED THEN INSERT (STUDENT_ID, QUESTION_ID, EXAM_ID, GIVEN_ANSWER, IS_CORRECT, OBTAINED_MARKS)
                     VALUES (:sid, :qId, :examid, :givenAnswer, 0, 0)`,
                    { sid, qId, examid, givenAnswer }
                );
            }

            // 3. Call compiled Oracle PL/SQL Stored Procedure
            const oracledb = require('oracledb');
            await conn.execute(
                `BEGIN
                    EVALUATE_EXAM_SUBMISSION(:sid, :examid, :totalScore);
                 END;`,
                {
                    sid,
                    examid,
                    totalScore: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                }
            );
        });

        res.status(200).json({ 
            success: true, 
            message: "Exam submitted and graded successfully", 
            redirect: `/student/exams/past/${examid}` 
        });
    } catch (err) {
        console.error("Error submitting exam answer:", err);
        res.status(500).json({ error: "Failed to submit exam answer" });
    }
});

// Route for viewing past exam results
router.get('/exams/past/:examId', requireLogin, async (req, res) => {
    try {
        const examId = parseInt(req.params.examId, 10);
        const sid = req.session.userId;

        const answersheet = await db.execute(
            `SELECT ea.STUDENT_ID, ea.QUESTION_ID, ea.EXAM_ID, ea.GIVEN_ANSWER, ea.IS_CORRECT, ea.OBTAINED_MARKS,
                    q.QUESTION_BODY, q.TYPE_NAME, q.OPTION_1, q.OPTION_2, q.OPTION_3, q.OPTION_4, q.CORRECT_ANSWER,
                    qsq.MARK_OF_QUESTION
             FROM EXAM_ANSWER ea
             JOIN QUESTION q ON (ea.QUESTION_ID = q.QUESTION_ID)
             JOIN QUESTION_SET_QUESTION qsq ON (ea.QUESTION_ID = qsq.QUESTION_ID)
             WHERE ea.STUDENT_ID = :sid AND ea.EXAM_ID = :examId
               AND qsq.QUESTION_SET_ID = (SELECT QUESTION_SET_ID FROM EXAM WHERE EXAM_ID = :examId)`,
            { sid, examId }
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
             WHERE ep.STUDENT_ID = :sid AND ep.EXAM_ID = :examId`,
            { sid, examId }
        );

        if (answersheet.rows && answersheet.rows.length > 0 && examdetails.rows && examdetails.rows.length > 0) {
            res.render('pages/Student/Exam_Details_Past.ejs', {
                examdetail: examdetails.rows,
                examAnswers: answersheet.rows
            });
        } else {
            res.send('<script>alert("No exam details found"); window.history.back();</script>');
        }
    } catch (err) {
        console.error("Error fetching past exam:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/exams/:examID/review", requireLogin, async (req, res) => {
    try {
        const examid = parseInt(req.params.examID, 10);
        const review = req.body.review || '';
        const sid = req.session.userId;

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `UPDATE EXAM_PARTICIPATION SET FEEDBACK = :review WHERE EXAM_ID = :examid AND STUDENT_ID = :sid`,
                { review, examid, sid }
            );
        });

        res.status(200).json({ success: true, message: "Review given" });
    } catch (err) {
        console.error("Error saving exam review:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/create-exam", requireLogin, async (req, res) => {
    try {
        const academicLevels = await db.execute(`SELECT * FROM ACADEMIC_LEVEL`);
        const questionsets = await db.execute(`SELECT * FROM QUESTION_SET`);

        res.render('pages/Student/Practice_exam_creation', {
            academicLevels: academicLevels.rows || [],
            questionSets: questionsets.rows || []
        });
    } catch (err) {
        console.error("Error loading student create-exam page:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/create-exam", requireLogin, async (req, res) => {
    try {
        const { examDate, examDuration, academicLevel, questionSet } = req.body;
        const submissionDeadlineFormatted = (examDate || '').replace('T', ' ').substring(0, 16);
        const examtype = 'Practice';

        const examName = (req.body.examName || 'Self Practice Exam').trim();

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `INSERT INTO EXAM (EXAM_NAME, EXAM_TYPE, SCHEDULED_BY, QUESTION_SET_ID, EXAM_TIME, EXAM_DURATION, LEVEL_NAME)
                 VALUES (:examName, :examtype, NULL, TO_NUMBER(:questionSet), TO_DATE(:submissionDeadlineFormatted, 'YYYY-MM-DD HH24:MI'), TO_NUMBER(:examDuration), :academicLevel)`,
                {
                    examName,
                    examtype,
                    questionSet: String(questionSet),
                    submissionDeadlineFormatted,
                    examDuration: String(examDuration || 30),
                    academicLevel
                }
            );
        });

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ message: "Exam created successfully" });
        }
        res.redirect('/student/exams');
    } catch (err) {
        console.error("Error creating student practice exam:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;