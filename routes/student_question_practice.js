const express = require('express');
const router = express.Router();
const oracledb = require("oracledb");

const dbConfig = require('../dbconfig');

const requireLogin = require('../middleware/requireLogin');


router.get("/get-all-questions",requireLogin, async (req, res) => {
	try {
		//connect to database
		const connection = await oracledb.getConnection(dbConfig);
		const result = await connection.execute(
			`SELECT question_id,TYPE_NAME,question_body,option_1,option_2,option_3,option_4,correct_answer FROM Question`,
			{},
			{ outFormat: oracledb.OUT_FORMAT_OBJECT }
		);

		// Closing the connection
		await connection.close();
		console.log(result);

		res.render('./pages/Student/Questions_Practice', { questioncollections: result.rows });

		//res.status(200).json(result.rows);
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});



router.get("/questions",requireLogin, async (req, res) => {
	

	const connection = oracledb.getConnection(dbConfig);
	const result = await connection.execute(
        `SELECT * FROM subject`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
	res.render("./pages/Student/Questions_Practice", { questioncollections: [] });
});

module.exports = router;