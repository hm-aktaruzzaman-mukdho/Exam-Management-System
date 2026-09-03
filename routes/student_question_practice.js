const express = require('express');
const router = express.Router();
const db = require('../db');
const requireLogin = require('../middleware/requireLogin');

router.get("/get-all-questions", requireLogin, async (req, res) => {
    try {
        const result = await db.execute(
            `SELECT QUESTION_ID, TYPE_NAME, QUESTION_BODY, OPTION_1, OPTION_2, OPTION_3, OPTION_4, CORRECT_ANSWER 
             FROM QUESTION WHERE NVL(IS_DELETED, 0) = 0 ORDER BY QUESTION_ID DESC`
        );

        res.render('pages/Student/Questions_Practice', { questioncollections: result.rows || [] });
    } catch (error) {
        console.error("Error fetching practice questions:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/questions", requireLogin, async (req, res) => {
    try {
        const result = await db.execute(
            `SELECT QUESTION_ID, TYPE_NAME, QUESTION_BODY, OPTION_1, OPTION_2, OPTION_3, OPTION_4, CORRECT_ANSWER 
             FROM QUESTION WHERE NVL(IS_DELETED, 0) = 0 ORDER BY QUESTION_ID DESC`
        );
        res.render("pages/Student/Questions_Practice", { questioncollections: result.rows || [] });
    } catch (error) {
        console.error("Error loading questions practice page:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;