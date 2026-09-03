const express = require('express');
const router = express.Router();
const db = require('../db');
const requireLogin = require('../middleware/requireLogin');

router.post("/create-question", requireLogin, async (req, res) => {
    try {
        const { questionType, questionBody, options, correctAnswer, academicLevel, selectedTopic } = req.body;
        const id = req.session.userId;
        const accessibilityLevel = '1';

        let option1 = "";
        let option2 = "";
        let option3 = "";
        let option4 = "";

        if (questionType === 'MCQ' && Array.isArray(options)) {
            option1 = options[0] || "";
            option2 = options[1] || "";
            option3 = options[2] || "";
            option4 = options[3] || "";
        } else if (questionType === 'TF' && Array.isArray(options)) {
            option1 = options[0] || "True";
            option2 = options[1] || "False";
        }

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `INSERT INTO QUESTION (TYPE_NAME, QUESTION_BODY, OPTION_1, OPTION_2, OPTION_3, OPTION_4, CORRECT_ANSWER, LEVEL_NAME, ACCESSIBILITY_LEVEL, TEACHER_ID, TOPIC_NAME) 
                 VALUES (:questionType, :questionBody, :option1, :option2, :option3, :option4, :correctAnswer, :academicLevel, :accessibilityLevel, :id, :selectedTopic)`,
                {
                    questionType,
                    questionBody: (questionBody || '').trim(),
                    option1: option1.trim(),
                    option2: option2.trim(),
                    option3: option3.trim(),
                    option4: option4.trim(),
                    correctAnswer: (correctAnswer || '').trim(),
                    academicLevel,
                    accessibilityLevel,
                    id,
                    selectedTopic
                }
            );
        });

        res.status(200).json({ success: true, message: "Question successfully added" });
    } catch (error) {
        console.error("Error creating question:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/question-creation", requireLogin, async (req, res) => {
    try {
        const topiccollection = await db.execute(`SELECT * FROM TOPIC ORDER BY TOPIC_NAME`);
        const academicLevel = await db.execute(`SELECT LEVEL_NAME FROM ACADEMIC_LEVEL ORDER BY LEVEL_NAME`);
        const question_type = await db.execute(`SELECT * FROM QUESTION_TYPE`);

        res.render("pages/Teacher/Question_Creation.ejs", {
            question_types: question_type.rows || [],
            topics: topiccollection.rows || [],
            academicLevels: academicLevel.rows || []
        });
    } catch (err) {
        console.error("Error loading question creation page:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/create-question-set", requireLogin, async (req, res) => {
    try {
        const questions = await db.execute(`SELECT * FROM QUESTION WHERE NVL(IS_DELETED, 0) = 0 ORDER BY QUESTION_ID DESC`);
        const topics = await db.execute(`SELECT * FROM TOPIC ORDER BY TOPIC_NAME`);

        res.render('pages/Teacher/Question_Set_Creation', {
            questions: questions.rows || [],
            topics: topics.rows || []
        });
    } catch (err) {
        console.error("Error loading question set creation page:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// JSON Search endpoint for questions by topic
router.get("/search-questions-by-topic", requireLogin, async (req, res) => {
    try {
        const selectedTopicsStr = req.query.selectedTopics || '';
        const selectedTopics = selectedTopicsStr.split(',').map(s => s.trim()).filter(Boolean);

        if (selectedTopics.length === 0) {
            const allQuestions = await db.execute(`SELECT * FROM QUESTION WHERE NVL(IS_DELETED, 0) = 0 ORDER BY QUESTION_ID DESC`);
            return res.status(200).json(allQuestions.rows || []);
        }

        // Build dynamic IN clause with bind parameters
        const binds = {};
        const placeholders = selectedTopics.map((topic, i) => {
            const key = `topic${i}`;
            binds[key] = topic;
            return `:${key}`;
        }).join(', ');

        const sql = `SELECT * FROM QUESTION WHERE NVL(IS_DELETED, 0) = 0 AND TOPIC_NAME IN (${placeholders}) ORDER BY QUESTION_ID DESC`;
        const result = await db.execute(sql, binds);

        res.status(200).json(result.rows || []);
    } catch (err) {
        console.error("Error searching questions by topic:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/create-question-set", requireLogin, async (req, res) => {
    try {
        const data = req.body;
        const tid = req.session.userId;
        const questionsetname = (data.questionSetName || '').trim();
        const questions = Array.isArray(data.selectedQuestions) ? data.selectedQuestions : [];

        if (!questionsetname || questions.length === 0) {
            return res.status(400).json({ error: "Question set name and questions are required" });
        }

        let totalMarks = 0;
        questions.forEach(q => {
            totalMarks += parseInt(q.mark || 1, 10);
        });

        await db.withTransaction(async (conn) => {
            // Insert question set with RETURNING clause
            const qsResult = await conn.execute(
                `INSERT INTO QUESTION_SET (QUESTION_SET_NAME, TEACHER_ID, NO_OF_QUESTIONS, TOTAL_MARKS)
                 VALUES (:questionsetname, :tid, :noOfQuestions, :totalMarks)
                 RETURNING QUESTION_SET_ID INTO :generatedId`,
                {
                    questionsetname,
                    tid,
                    noOfQuestions: questions.length,
                    totalMarks,
                    generatedId: { type: db.oracledb.NUMBER, dir: db.oracledb.BIND_OUT }
                }
            );

            const questionSetId = qsResult.outBinds.generatedId[0];

            for (const question of questions) {
                const qId = parseInt(question.questionId, 10);
                const mark = parseInt(question.mark || 1, 10);
                await conn.execute(
                    `INSERT INTO QUESTION_SET_QUESTION (QUESTION_SET_ID, QUESTION_ID, MARK_OF_QUESTION)
                     VALUES (:questionSetId, :qId, :mark)`,
                    { questionSetId, qId, mark }
                );
            }
        });

        res.status(200).json({ success: true, message: "Question set created successfully" });
    } catch (err) {
        console.error("Error creating question set:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;