const express = require('express');
const router = express.Router();
const oracledb = require("oracledb");

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dbConfig = require('../dbconfig');

const requireLogin = require('../middleware/requireLogin');

router.get("/assignments",requireLogin, async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const assignmentdetails = await connection.execute(
            `SELECT * FROM ASSIGNMENT`, {}
        );

        await connection.close();

        res.render('pages/Teacher/Assignments.ejs', { assignments: assignmentdetails.rows });

    }
    catch (err) {
        console.log(err);
    }
});

router.get("/assignments/:assignmentId",requireLogin, async (req, res) => {
    try {
        const assignmentId = req.params.assignmentId;
        const connection = await oracledb.getConnection(dbConfig);
        const assignmentdetails = await connection.execute(
            `SELECT * FROM ASSIGNMENT where assignment_id = :aid`, [assignmentId]
        );

        const submittedassignments = await connection.execute(
            `SELECT * FROM ASSIGNMENT_SUBMISSION WHERE ASSIGNMENT_ID= :AID`, [assignmentId]
        );

        console.log(assignmentdetails.rows);
        console.log(submittedassignments.rows);

        await connection.close();

        res.render('pages/Teacher/Assignment_Details_T', { assignments: assignmentdetails.rows, submittedAssignments: submittedassignments.rows });

    } catch (err) {
        console.log(err);
        res.status(500).send('Error rendering template');
    }
});

router.post("/assignments/:assignmentID/update",requireLogin, async (req, res) => {
    try {
        const { newDeadline, newMark } = req.body;
        const aid = req.params.assignmentID;

        console.log(newDeadline, newMark);
        const connection = await oracledb.getConnection(dbConfig);
        if (!newDeadline && !newMark) {
            res.status(404).send("Enter parameters");
        }
        else if (!newDeadline) {
            await connection.execute(
                `UPDATE ASSIGNMENT SET total_marks = newMark WHERE assignment_id = :aid`, [newMark, aid]
            );
        }
        else if (!newMark) {
            const submissionDeadlineFormatted = newDeadline.replace('T', ' ').substring(0, 16);
            await connection.execute(
                `UPDATE ASSIGNMENT SET SUBMISSION_DEADLINE = TO_DATE(:submissionDeadlineFormatted,'YYYY-MM-DD HH24:MI') WHERE assignment_id = :aid`, [submissionDeadlineFormatted, aid]
            );
        }
        else {
            const submissionDeadlineFormatted = newDeadline.replace('T', ' ').substring(0, 16);
            await connection.execute(
                `UPDATE ASSIGNMENT SET SUBMISSION_DEADLINE = TO_DATE(:submissionDeadlineFormatted,'YYYY-MM-DD HH24:MI') WHERE assignment_id = :aid`, [submissionDeadlineFormatted, aid]
            );

            await connection.execute(
                `UPDATE ASSIGNMENT SET total_marks = :newMark WHERE assignment_id = :aid`, [newMark, aid]
            );

        }

        connection.commit();
        connection.close();

    }
    catch (err) {
        console.log(err);
    }
});

//Uploading student mark
router.post("/assignments/:assignmentID/submit-mark",requireLogin, async (req, res) => {
    try{
        
        const aid = req.params.assignmentID;
        const studentId = req.body.studentId;
        const mark = req.body.mark;

        //add condition so that mark will capped at assignment mark.
        console.log("Student mark: " + studentId);
        console.log(aid, studentId, mark);
        const connection = await oracledb.getConnection(dbConfig);
        await connection.execute(
            `UPDATE ASSIGNMENT_SUBMISSION SET MARKS_OBTAINED = :mark where STUDENT_ID= :studentId and ASSIGNMENT_ID= :aid`, [mark, studentId, aid]
        );

        connection.commit();
        connection.close();

        res.status(200).json({ message: "Mark successfully submitted" });
    }
    catch (err) {
        console.log(err);
    }
});

router.get("/assignments/:assignmentID/students/:studentID/download",requireLogin, async (req, res) => {
    try {
        const filePath = `D:/Code/Database_Project/Scratch/uploads/Assignment_Answer/assignment_answer_${req.params.assignmentID}_${req.params.studentID}.pdf`;
        //res.download('D:/Code/Database_Project/Scratch/uploads/Assignment_Answer/assignment_answer_1_46.pdf');
        if (fs.existsSync(filePath)) {
            // If the file exists, send it for download
            res.download(filePath);
        } else {
            // If the file does not exist, send an error response
            res.status(404).send('File not found.Maybe the student hasn\'t uploaded the answer file yet.');
        }
    } catch (err) { console.lower(err); }
});


router.get("/assignments/:assignmentID/download",requireLogin, async (req, res) => {
    try {
        const filePath = `D:/Code/Database_Project/Scratch/uploads/Assignment_Question/assignment_questions_${req.params.assignmentID}.pdf`;

        if (fs.existsSync(filePath)) {
            // If the file exists, send it for download
            res.download(filePath);
        } else {
            // If the file does not exist, send an error response
            res.status(404).send('File not found.Maybe the teacher hasn\'t uploaded the assignment file yet.');
        }
    } catch (err) { console.lower(err); }
});


router.get("/create-assignment", requireLogin, async (req, res) => {
    try {

        const connection = await oracledb.getConnection(dbConfig);
        const academicLevels = await connection.execute(
            `SELECT * FROM ACADEMIC_LEVEL`, {}
        );

        const topics = await connection.execute(
            `SELECT TOPIC_NAME from TOPIC`, {}
        );
        res.render('pages/Teacher/Assignment_Creation', { topics: topics.rows, academicLevels: academicLevels.rows });
    }
    catch (err) { console.log(err); }

});

// Define the route for handling assignment question upload
// Define route for handling form submission, database insertion, and file upload
router.post('/create-assignment', requireLogin, async (req, res) => {
    try {
        const { assignmentName, topicName, levelName, assignmentDetails, submissionDeadline, totalMarks } = req.body;
        const assignmentfile = 'NO';
        const teacher_ID = 1;
        //console.log(req.body);


        const submissionDeadlineFormatted = submissionDeadline.replace('T', ' ').substring(0, 16); // Format: 'YYYY-MM-DD HH:MM'

        const connection = await oracledb.getConnection(dbConfig);
        await connection.execute(
            `INSERT INTO assignment (ASSIGNMENT_NAME, TOPIC_NAME, LEVEL_NAME,ASSIGNMENT_DETAILS,SUBMISSION_DEADLINE,TOTAL_MARKS,   TEACHER_ID) 
    VALUES (:assignmentName, :topicName, :levelName,:assignmentDetails,TO_DATE(:submissionDeadlineFormatted,'YYYY-MM-DD HH24:MI'),:totalMarks, :teacher_ID)`,
            {
                assignmentName,
                topicName,
                levelName,
                assignmentDetails,
                submissionDeadlineFormatted,
                totalMarks,
                teacher_ID
            }
        );

        await connection.commit();
        await connection.close();


        res.status(200).send("success");

        // Insert assignment details into the database
        // Your database insertion code goes here
    }
    catch (err) {
        console.log(err);
    }

});


//Routes for assignment creation
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'D:/Code/Database_Project/Scratch/uploads/Assignment_Question'); // Set your destination folder where files will be stored
    },
    filename: function (req, file, cb) {
        // Constructing the filename with the specified naming convention
        const fileName = `assignment_questions_${req.params.assignmentId}${path.extname(file.originalname)}`;

        // Check if a file with the same name already exists
        fs.access(path.join('D:/Code/Database_Project/Scratch/uploads/Assignment_Question', fileName), fs.constants.F_OK, (err) => {
            if (!err) {
                // If file exists, delete it before saving the new one
                fs.unlink(path.join('D:/Code/Database_Project/Scratch/uploads/Assignment_Question', fileName), (unlinkErr) => {
                    if (unlinkErr) return cb(unlinkErr);
                    cb(null, fileName);
                });
            } else {
                cb(null, fileName);
            }
        });
    }
});

// Initialize multer with the defined storage
const upload = multer({ storage: storage });

// Route to handle assignment question upload
router.post('/assignments/:assignmentId/upload-question', upload.single('assignmentQuestionPdf'), (req, res) => {
    // Handle assignment question upload here
    // The uploaded file is available as req.file
    res.send('Assignment question uploaded successfully');
});



module.exports = router;