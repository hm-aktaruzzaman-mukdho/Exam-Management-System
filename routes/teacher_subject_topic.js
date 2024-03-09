const express = require('express');
const router = express.Router();
const oracledb = require("oracledb");

const dbConfig = require('../dbconfig');

const requireLogin = require('../middleware/requireLogin');
const dbconfig = require('../dbconfig');

router.get("/modify-topic-subject",requireLogin, async (req, res) => {
	try {
		const connection = await oracledb.getConnection(dbConfig);
		const topiccollection = await connection.execute(
			`SELECT * FROM TOPIC`, {}
		);

		const subjectscollection = await connection.execute(
			`SELECT * FROM SUBJECT`, {}
		);

		await connection.close();

		console.log(topiccollection.rows);
		res.render('pages/Teacher/Topic_subject_modify.ejs', { topics: topiccollection.rows, subjects: subjectscollection.rows });
	}
	catch (err) {
		console.log(err);
	}
});

router.post("/create-subject",requireLogin, async (req, res) => {
	try {
		const { subjectName, subjectDescription } = req.body;
		console.log(subjectName);
		console.log(subjectDescription);


		const connection = await oracledb.getConnection(dbconfig);
		connection.execute(
			`Insert into SUBJECT(SUBJECT_NAME,SUBJECT_DESCRIPTION) VALUE(:subjectName,:subjectDescription)`,
			{
				subjectName,
                subjectDescription
			}
		);
		connection.commit();
		connection.close();

		res.status(200).json({ message: "Question successfully added" });
	}
	catch (err) {
		console.log(err);
	}
});
router.post("/create-topic",requireLogin, async (req, res) => {
	try {
		const { topicName, subjectName, topicDescription } = req.body;
		console.log(topicName);
		console.log(subjectName);
		
		const connection = await oracledb.getConnection(dbconfig);
		connection.execute(
			`Insert into TOPIC(TOPIC_NAME,SUBJECT_NAME,TOPIC_DESCRIPTION) VALUE(:topicName,:subjectName,:topicDescription)`,
			{
				topicName,
				subjectName,
                topicDescription
			}
		);
		connection.commit();
		connection.close();

		res.status(200).json({ message: "Question successfully added" });

	}
	catch (err) {
		console.log(err);
	}

});
router.post("/delete-subject",requireLogin, async (req, res) => {
	try {
		const { subjectToDelete } = req.body;
		console.log(subjectToDelete);

		const connection = await oracledb.getConnection(dbconfig);
		connection.execute(
			`DELETE FROM SUBJECT
			where SUBJECT_NAME like ${subjectToDelete}`,{}
		);
		connection.commit();
		connection.close();
		res.status(200).json({ message: "Question successfully added" });
	}
	catch (err) {
		console.log(err);
	}
});
router.post("/delete-topic",requireLogin, async (req, res) => {
	try {
		const { topicToDelete } = req.body;
		console.log(topicToDelete);
		const connection = await oracledb.getConnection(dbconfig);
		connection.execute(
			`DELETE FROM TOPIC
			where topic_name like ${topicName}`,{}
		);
		connection.commit();
		connection.close();
		res.status(200).json({ message: "Question successfully added" });
	}
	catch (err) {
		console.log(err);
	}
});

module.exports = router;