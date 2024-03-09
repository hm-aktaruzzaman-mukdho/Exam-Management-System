const express = require('express');
const router = express.Router();
const oracledb = require("oracledb");

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dbConfig = require('../dbconfig');

const requireLogin = require('../middleware/requireLogin');

// Route for viewing assignments
router.get('/assignments',requireLogin, async (req, res) => {
	try {

		const connection = await oracledb.getConnection(dbConfig);
		const result = await connection.execute(
			`SELECT * FROM ASSIGNMENT`,
			{},
			{ outFormat: oracledb.OUT_FORMAT_OBJECT }
		);

		console.log(result.rows); // Accessing '
		res.render('pages/Student/Assignments', { assignments: result.rows });
	} catch (err) {
		console.log(err);
	}
});

// Route for viewing a specific assignments

router.get('/assignments/:assignmentId',requireLogin, async (req, res) => {
	const assignmentId = req.params.assignmentId;

	try {
		// Create a connection to the Oracle database
		const connection = await oracledb.getConnection(dbConfig);

		// Prepare SQL query to fetch assignment details
		const sql = `SELECT * FROM assignment WHERE assignment_id = :assignmentId`;

		// Bind the assignmentId parameter
		const result = await connection.execute(sql, [assignmentId]);

		// Close the connection
		await connection.close();

		// Extract assignment details from the query result
		const assignment = result.rows[0];

		if (!assignment) {
			// If assignment is not found, send a 404 error response
			res.status(404).send('Assignment not found');
			return;
		}

		//res.send("Your assignment id is: " + assignmentId);

		// Render the assignment_details.ejs page with the assignment details
		res.render('pages/Student/Assignment_Details', { assignment: assignment });

	} catch (error) {
		// Handle any errors that occur during the database query
		console.error('Error fetching assignment:', error);
		res.status(500).send('Internal Server Error');
	}
});



// Multer storage configuration
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'D:/Code/Database_Project/Scratch/uploads/Assignment_Answer'); // Set your destination folder where files will be stored
	},
	filename: function (req, file, cb) {
		// Constructing the filename with the specified naming convention
		const fileName = `assignment_answer_${req.params.assignmentId}_${req.session.userId}${path.extname(file.originalname)}`;

		// Check if a file with the same name already exists
		fs.access(path.join('D:/Code/Database_Project/Scratch/uploads/Assignment_Answer', fileName), fs.constants.F_OK, (err) => {
			if (!err) {
				// If file exists, delete it before saving the new one
				fs.unlink(path.join('D:/Code/Database_Project/Scratch/uploads/Assignment_Answer', fileName), (unlinkErr) => {
					if (unlinkErr) return cb(unlinkErr);
					cb(null, fileName);
				});
			} else {
				cb(null, fileName);
			}
		});
	}
});

router.get('/assignments/:assignment_id/submission',requireLogin, async (req, res) => {
	const filePath = `D:/Code/Database_Project/Scratch/uploads/Assignment_Answer/assignment_answer_${req.params.assignment_id}_${req.session.userId}.pdf`;

	if (fs.existsSync(filePath)) {
		// If the file exists, send it for download
		res.download(filePath);
	} else {
		// If the file does not exist, send an error response
		res.status(404).send('File not found.You haven\'t uploaded any assignment answer yet.');
	}
});

router.get('/assignments/:assignment_id/download',requireLogin, async (req, res) => {
	const par=req.params.assignment_id;
    const filePath = `D:/Code/Database_Project/Scratch/uploads/Assignment_Question/assignment_questions_${par}.pdf`;

    if (fs.existsSync(filePath)) {
        // If the file exists, send it for download
        res.download(filePath);
    } else {
        // If the file does not exist, send an error response
        res.status(404).send('File not found.Maybe the teacher hasn\' uploaded the assignment file yet.');
    }
});

const upload = multer({ storage: storage });

// Route to handle file upload
router.post('/assignments/:assignmentId/upload/',requireLogin, upload.single('assignmentAnswer'), (req, res) => {
	res.send('File uploaded successfully');
});
module.exports = router;