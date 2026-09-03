const express = require('express');
const router = express.Router();
const db = require('../db');
const requireLogin = require('../middleware/requireLogin');

router.get("/get-all-topics", requireLogin, async (req, res) => {
    try {
        const result = await db.execute(
            `SELECT TOPIC_NAME, SUBJECT_NAME, TOPIC_DESCRIPTION FROM TOPIC ORDER BY TOPIC_NAME`
        );
        res.status(200).json(result.rows || []);
    } catch (error) {
        console.error("Error fetching all topics:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/search-topics", requireLogin, async (req, res) => {
    try {
        const { searchTerm } = req.body;
        const term = `%${(searchTerm || '').trim().toLowerCase()}%`;

        const result = await db.execute(
            `SELECT TOPIC_NAME, SUBJECT_NAME, TOPIC_DESCRIPTION 
             FROM TOPIC 
             WHERE LOWER(TOPIC_NAME) LIKE :term OR LOWER(TOPIC_DESCRIPTION) LIKE :term
             ORDER BY TOPIC_NAME`,
            { term }
        );

        res.status(200).json(result.rows || []);
    } catch (error) {
        console.error("Error searching topics:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/get-subjects", requireLogin, async (req, res) => {
    try {
        const result = await db.execute(
            `SELECT SUBJECT_NAME, SUBJECT_DESCRIPTION FROM SUBJECT ORDER BY SUBJECT_NAME`
        );
        res.status(200).json(result.rows || []);
    } catch (err) {
        console.error("Error fetching subjects:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;