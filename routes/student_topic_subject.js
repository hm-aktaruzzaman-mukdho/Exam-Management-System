const express = require('express');
const router = express.Router();
const oracledb = require("oracledb");

const dbConfig = require('../dbconfig');

const requireLogin = require('../middleware/requireLogin');


router.get("/get-all-topics",requireLogin, async (req, res) => {
	try {
		// Connect to the Oracle database
		const connection = await oracledb.getConnection(dbConfig);
		const result = await connection.execute(
			`SELECT topic_name,subject_name,topic_description FROM topic`,
			{},
			{ outFormat: oracledb.OUT_FORMAT_OBJECT }
		);

		// Closing the connection
		await connection.close();
		console.log(result);

		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/search-topics",requireLogin, async (req, res) => {
	try {
		// Connect to the Oracle database
		const { searchTerm } = req.body;
		console.log(searchTerm);
		const connection = await oracledb.getConnection(dbConfig);
		const result = await connection.execute(
			`SELECT topic_name,subject_name,topic_description FROM topic WHERE lower(topic_name) LIKE lower(:SEARCHTERM)`,
			{ searchTerm },
			{ outFormat: oracledb.OUT_FORMAT_OBJECT }
		);

		// Closing the connection
		await connection.close();
		console.log(result);
		res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/get-subjects",requireLogin, async (req, res) => {
	try {
		// Connect to the Oracle database
		const connection = await oracledb.getConnection(dbConfig);
		const result = await connection.execute(
			`SELECT subject_name FROM topic`,
			{},
			{ outFormat: oracledb.OUT_FORMAT_OBJECT }
		);

		// Closing the connection
		await connection.close();
		console.log(result);
		res.status(200).json(result.rows);
	} catch (err) {
		console.log(err);
	}
});


module.exports = router;