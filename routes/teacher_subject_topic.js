const express = require('express');
const router = express.Router();
const db = require('../db');
const requireLogin = require('../middleware/requireLogin');

router.get("/modify-topic-subject", requireLogin, async (req, res) => {
    try {
        const topiccollection = await db.execute(`SELECT * FROM TOPIC ORDER BY TOPIC_NAME`);
        const subjectscollection = await db.execute(`SELECT * FROM SUBJECT ORDER BY SUBJECT_NAME`);

        res.render('pages/Teacher/Topic_subject_modify.ejs', {
            topics: topiccollection.rows || [],
            subjects: subjectscollection.rows || []
        });
    } catch (err) {
        console.error("Error fetching topics and subjects:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/create-subject", requireLogin, async (req, res) => {
    try {
        const { subjectName, subjectDescription } = req.body;
        if (!subjectName) {
            return res.status(400).json({ error: "Subject name is required" });
        }

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `INSERT INTO SUBJECT (SUBJECT_NAME, SUBJECT_DESCRIPTION) VALUES (:subjectName, :subjectDescription)`,
                {
                    subjectName: subjectName.trim(),
                    subjectDescription: (subjectDescription || '').trim()
                }
            );
        });

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ message: "Subject successfully added" });
        }
        res.redirect('/teacher/modify-topic-subject');
    } catch (err) {
        console.error("Error creating subject:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/create-topic", requireLogin, async (req, res) => {
    try {
        const { topicName, subjectName, topicDescription } = req.body;
        if (!topicName || !subjectName) {
            return res.status(400).json({ error: "Topic and subject names are required" });
        }

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `INSERT INTO TOPIC (TOPIC_NAME, SUBJECT_NAME, TOPIC_DESCRIPTION) VALUES (:topicName, :subjectName, :topicDescription)`,
                {
                    topicName: topicName.trim(),
                    subjectName: subjectName.trim(),
                    topicDescription: (topicDescription || '').trim()
                }
            );
        });

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ message: "Topic successfully added" });
        }
        res.redirect('/teacher/modify-topic-subject');
    } catch (err) {
        console.error("Error creating topic:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/delete-subject", requireLogin, async (req, res) => {
    try {
        const { subjectToDelete } = req.body;
        if (!subjectToDelete) {
            return res.status(400).json({ error: "Subject to delete is required" });
        }

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `DELETE FROM SUBJECT WHERE SUBJECT_NAME = :subjectToDelete`,
                { subjectToDelete: subjectToDelete.trim() }
            );
        });

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ message: "Subject successfully deleted" });
        }
        res.redirect('/teacher/modify-topic-subject');
    } catch (err) {
        console.error("Error deleting subject:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/delete-topic", requireLogin, async (req, res) => {
    try {
        const { topicToDelete } = req.body;
        if (!topicToDelete) {
            return res.status(400).json({ error: "Topic to delete is required" });
        }

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `DELETE FROM TOPIC WHERE TOPIC_NAME = :topicToDelete`,
                { topicToDelete: topicToDelete.trim() }
            );
        });

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ message: "Topic successfully deleted" });
        }
        res.redirect('/teacher/modify-topic-subject');
    } catch (err) {
        console.error("Error deleting topic:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;