const express = require('express');
const router = express.Router();
const oracledb = require("oracledb");

const dbConfig = require('../dbconfig');

const requireLogin = require('../middleware/requireLogin');


router.post("/create-question", requireLogin, async (req, res) => {
	console.log("Create Question");
	try {
		// Extract new user details from the request body
		const { questionType, questionBody, options, correctAnswer, academicLevel, selectedTopic } = req.body;

		console.log(questionType, questionBody, options, correctAnswer, academicLevel, selectedTopic);
		//query to find the id of the teacher.
		let option1;
		let option2;
		let option3;
		let option4;
		if (questionType == 'FIB') {
			option1 = "";
			option2 = "";
			option3 = "";
			option4 = "";
		}
		else if (questionType == 'MCQ') {
			option1 = options[0];
			option2 = options[1];
			option3 = options[2];
			option4 = options[3];
		}
		else {
			option1 = options[0];
			option2 = options[1];
			option3 = "";
			option4 = "";
		}
		const accessibilityLevel = 1;

		//Connect to the Oracle database
		const connection = await oracledb.getConnection(dbConfig);

		// let existingemail = req.session.user;
		// //console.log(existingemail);

		// let teacherid = await connection.execute(
		// 	`SELECT teacher_id from teacher where email like :EXISTINGEMAIL`,
		// 	{ existingemail }
		// );

		const id = req.session.userId;

		//let id = teacherid.rows[0].TEACHER_ID;
		//Execute a query to insert a new user
		await connection.execute(
			`INSERT INTO Question (TYPE_NAME,question_body,option_1,option_2,option_3,option_4,correct_Answer,LEVEL_NAME,accessibility_Level,teacher_id,TOPIC_NAME) 
       VALUES (:questionType,:questionBody,:option1,:option2,:option3,:option4,:correctAnswer,:academicLevel,:accessibilityLevel,:ID,:selectedTopic)`,
			{ questionType, questionBody, option1, option2, option3, option4, correctAnswer, academicLevel, accessibilityLevel, id, selectedTopic }
		);

		await connection.commit();

		// Close the database connection
		await connection.close();

		// Respond with a success message
		res.status(200).json({ message: "Question successfully added" });
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/question-creation", requireLogin, async (req, res) => {
	try {
		const connection = await oracledb.getConnection(dbConfig);
		const topiccollection = await connection.execute(
			`SELECT * FROM TOPIC`, {}
		);

		const academicLevel = await connection.execute(
			`SELECT LEVEL_NAME FROM ACADEMIC_LEVEL`, {}
		);

		const question_type = await connection.execute(
			`SELECT * FROM QUESTION_TYPE`, {}
		);

		await connection.close();

		//console.log(topiccollection.rows);
		res.render("pages/Teacher/Question_Creation.ejs", { question_types: question_type.rows, topics: topiccollection.rows, academicLevels: academicLevel.rows });
	}
	catch (err) {
		console.log(err);
	}
});


router.get("/create-question-set", requireLogin, async (req, res) => {
	try {
		const connection = await oracledb.getConnection(dbConfig);
		const questions = await connection.execute(
			`SELECT * FROM Question`, {}
		);

		const topics = await connection.execute(
			`SELECT * FROM Topic`, {}
		);
		await connection.close();

		res.render('pages/Teacher/Question_Set_Creation', { questions: questions.rows, topics: topics.rows });

	}
	catch (err) {
		console.log(err);
	}
});

router.get("/search-questions-by-topic", async (req, res) => {
	try {
		const selectedTopicsStr = req.query.selectedTopics;

		// Convert the comma-separated string of topics to an array
		const selectedTopics = selectedTopicsStr.split(',');
		console.log(selectedTopics);
		const connection = await oracledb.getConnection(dbConfig);

		let allQuestions = await connection.execute(
			`SELECT * FROM Question WHERE TOPIC_NAME = '${selectedTopics[0]}'`, {}
		);;

		for (const topic of selectedTopics) {
			const questions = await connection.execute(
				`SELECT * FROM Question WHERE TOPIC_NAME = '${topic}'`, {}
			);
			allQuestions.concat(questions.rows);
		}

		await connection.close();
		console.log(allQuestions.rows);

		res.render('pages/Teacher/Question_Set_Creation', { questions: allQuestions.rows, topics: [] });

	} catch (err) {
		console.log(err);
	}
});


router.post("/create-question-set", requireLogin, async (req, res) => {
	try {
		const data = req.body;
		const tid = req.session.userId;
		const questionsetname = data.questionSetName;
		const questions = data.selectedQuestions;
		//console.log(data);

		const connection = await oracledb.getConnection(dbConfig);
		console.log(data.questionSetName);
		await connection.execute(
			`Insert into question_set(question_set_name,teacher_id)
			values(:questionsetname,:tid)`,
			{ questionsetname, tid }
		);

		const questionsetid = await connection.execute(
			`Select * from question_set where question_set_name='${questionsetname}' and teacher_id=${tid}`, {}
		);

		console.log(questionsetid.rows[0].QUESTION_SET_ID);

		const questionsetids = questionsetid.rows[0].QUESTION_SET_ID;


		questions.forEach(async (question) => {
			await connection.execute(
				`Insert into question_set_question(question_set_id,question_id,mark_of_Question)
                values(${questionsetids},${question.questionId},${question.mark})`,
				{}
			);
		});



		connection.commit();
		connection.close();
		res.status(200).send({ message: "Success" });

	}
	catch (err) {
		console.log(err);
	}
});


module.exports = router;