const express = require('express');
const router = express.Router();
const oracledb = require("oracledb");

const dbConfig = require('../dbconfig');

const requireLogin = require('../middleware/requireLogin');

router.get("/exams",requireLogin, async (req, res) => {
	try {
		const connection = await oracledb.getConnection(dbConfig);
		const examdetails = await connection.execute(
			`SELECT * FROM EXAM`, {}
		);

		await connection.close();

		res.render('pages/Teacher/Exams', { exams: examdetails.rows });

	}
	catch (err) {
		console.log(err);
	}
});

router.get("/exams/:examID",requireLogin, async (req, res) => {
	try{
		
		const connection = await oracledb.getConnection(dbConfig);
        const examId = req.params.examID;
        const result = await connection.execute(
            `SELECT * FROM EXAM_PARTICiPATION WHERE EXAM_ID = ${examId}`, {}
        );

		connection.close();

		res.render('pages/Teacher/Exam_Details', { exams: result.rows });
	}
	catch (err) {
        console.log(err);
    }
	
});

// Route for viewing a specific exam
router.get('/exams/past/:examId/:studentid', requireLogin, async (req, res) => {
	try {
		const examId = req.params.examId;
		const sid = req.session.userId;

		const connection = await oracledb.getConnection(dbConfig);
		const asnwersheet = await connection.execute(
			`SELECT * 
		FROM EXAM_ANSWER JOIN QUESTION USING(QUESTION_ID) JOIN QUESTION_SET_QUESTION using (QUESTION_ID)
		
		WHERE STUDENT_ID=${sid} AND EXAM_ID=${examId} and QUESTION_SET_ID=(select QUESTION_SET_ID from exam where EXAM_ID=${examId})`,
			{}
		);

		const examdetails = await connection.execute(
			`SELECT * 
			FROM EXAM_PARTICIPATION JOIN EXAM e using(EXAM_ID) JOIN TEACHER t on(e.SCHEDULED_BY = t.teacher_ID) join QUESTION_SET qs on(e.QUESTION_SET_ID=qs.question_set_ID)
			
			WHERE STUDENT_ID=${sid} AND EXAM_ID=${examId}`, {}
		);

		connection.close();
		console.log("Exam details");
		console.log(examdetails.rows);
		console.log("Answer sheet");
		console.log(asnwersheet.rows);

		if (asnwersheet.rows.length > 0 && examdetails.rows.length > 0) 
		{
			res.render('pages/Student/Exam_Details_Past.ejs', { examdetail: examdetails.rows, examAnswers: asnwersheet.rows });
		}
		else {
			res.send('<script>window.history.back();</script>');
		}
	} catch (err) {
		console.log(err);
	}
});

router.get("/create-exam",requireLogin, async (req, res) => {
	try {
		const connection = await oracledb.getConnection(dbConfig);
		const academicLevels = await connection.execute(
			`SELECT * FROM ACADEMIC_LEVEL`, {}
		);

		const questionsets = await connection.execute(
			`SELECT * FROM QUESTION_SET`, {}
		);

		await connection.close();

		res.render('pages/Teacher/Exam_Creation', { academicLevels: academicLevels.rows, questionSets: questionsets.rows });

	}
	catch (err) {
		console.log(err);
	}
});

router.post("/create-exam",requireLogin, async (req,res) =>{
	try {
        const { examName,examDate,examDuration,academicLevel,questionSet } = req.body;
        console.log(examName);
		console.log(examDate);
		console.log(examDuration);
		console.log(academicLevel);
		console.log(questionSet);

		const submissionDeadlineFormatted = examDate.replace('T', ' ').substring(0, 16); // Format: 'YYYY-MM-DD HH:MM'

		const tid =req.session.userId;
		console.log(tid);
		const examtype='Scheduled';
        //console.log(examDescription);
        //data is comming to server successfully
        const connection = await oracledb.getConnection(dbConfig);
        await connection.execute(
            `insert into exam(EXAM_TYPE,SCHEDULED_BY,QUESTION_SET_ID,EXAM_TIME,EXAM_DURATION,LEVEL_NAME)
			values(:examtype,:tid,TO_NUMBER(:questionSet),TO_DATE(:submissionDeadlineFormatted,'YYYY-MM-DD HH24:MI'),TO_NUMBER(:examDuration),:academicLevel)`,
			{
				examtype,
                tid,
                questionSet,
                submissionDeadlineFormatted,
                examDuration,
                academicLevel
			}			
        );

		connection.commit();
        await connection.close();

		res.status(200).send({message:"Exam created successfully"});
        //res.render('pages/Teacher/Exams', { exams: examdetails.rows });

    }
    catch (err) {
        console.log(err);
    }
});


module.exports = router;