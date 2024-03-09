const express = require('express');
const router = express.Router();
const oracledb = require("oracledb");

const dbConfig = require('../dbconfig');

const requireLogin = require('../middleware/requireLogin');


router.post("/submit-exam-answer",requireLogin, async (req, res) => {
	const formDataArray = req.body;
	formDataArray.forEach(formData => {
		console.log(formData); // Accessing 'QURSTION_ID'
		//console.log(formData.GIVEN_ANSWER); // Accessing 'GIVEN_ANSWER'
		// You can access other attributes similarly
	});

	res.redirect("/student");
});

router.get('/exams',requireLogin, async (req, res) => {
	try {
		// Connect to the Oracle database
		const connection = await oracledb.getConnection(dbConfig);
		const result = await connection.execute(
			`SELECT * FROM EXAM`,
			{},
			{ outFormat: oracledb.OUT_FORMAT_OBJECT }
		);

		console.log(result.rows); // Accessing '
		res.render('pages/Student/All_Exams.ejs', { exams: result.rows });
	} catch (err) {
		console.log(err);
	}
});

router.get('/exams/ongoing/:examId', requireLogin, async (req, res) => {
	try {
		const examid = req.params.examId;
		const sid = req.session.userId;


		const connection = await oracledb.getConnection(dbConfig);

		//check if the student has already submitted answer.
		const isanswered = await connection.execute(
            `SELECT * FROM EXAM_PARTICIPATION where STUDENT_ID=${sid} and EXAM_ID=${examid}`, {}
        );

		if(isanswered.rows.length > 0)
		{
			res.redirect('/student/exams/past/'+examid);
		}


		const examquestions = await connection.execute(
			`select * from QUESTION_SET_QUESTION qsq join QUESTION q on(q.QUESTION_ID=qsq.QUESTION_ID)
			where qsq.QUESTION_SET_ID=(select QUESTION_SET_ID from EXAM where exam_ID=${examid})`, {}
		);

		const examduration = await connection.execute(
			`SELECT * from exam where exam_id=${examid}`, {}
		);

		connection.close();
		console.log(examduration.rows)

		//console.log(examquestions.rows);

		res.render('pages/Student/Exam_Giving.ejs', { questioncollections: examquestions.rows, examDurationMinutes: examduration.rows });
	} catch (err) {
		console.log(err);
	}
});

router.post('/exams/:examid/submit-exam-answer', requireLogin, async (req, res) => {
	try {
		const examid = req.params.examid;
		const sid = req.session.userId;
		const formDataArray = req.body;

		const connection = await oracledb.getConnection(dbConfig);

		console.log(req.params.examid);
		formDataArray.forEach(formData => {
			connection.execute(
				`INSERT INTO EXAM_ANSWER (STUDENT_ID, QUESTION_ID, EXAM_ID, GIVEN_ANSWER)
			VALUES (${sid}, ${formData.QUESTION_ID}, ${examid}, ${formData.GIVEN_ANSWER})`, {}
			);
			console.log(formData.GIVEN_ANSWER);
		});

		connection.execute(
			`INSERT INTO EXAM_PARTICIPATION(STUDENT_ID, EXAM_ID)
			VALUES (${sid}, ${examid})`, {}
		);
		connection.commit();
		connection.close();
	}
	catch (err) {
		console.log(err);
	}
});

// Route for viewing a specific exam
router.get('/exams/past/:examId', requireLogin, async (req, res) => {
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


router.post("/exams/:examID/review", requireLogin, async (req, res) => {
	try {
		const examid = req.params.examID;
		const review = req.body.review;
		const sid = req.session.userId;
		// console.log(examid);
		// console.log(review);

		const connection = await oracledb.getConnection(dbConfig);
		const asnwersheet = await connection.execute(
			`UPDATE EXAM_PARTICIPATION SET FEEDBACK=:review WHERE EXAM_ID=:examid AND STUDENT_ID=:sid`,
			{ review, examid, sid }
		);

		connection.commit();
		connection.close();
		//res.status(200).redirect(`/student/exam/${examid}`);

		res.status(200).send({ message: "Review given" });

	}
	catch (err) {
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

		res.render('pages/Student/Practice_exam_creation', { academicLevels: academicLevels.rows, questionSets: questionsets.rows });

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

		const tid =1;
		console.log(tid);
		const examtype='Practice';
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