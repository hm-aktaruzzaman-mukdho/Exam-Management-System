const express = require('express');
const router = express.Router();
const oracledb = require("oracledb");

const dbConfig = require('../dbconfig');

const requireLogin = require('../middleware/requireLogin');



router.get("/", (req, res) => {
    res.render('pages/Teacher/Dashboard');
});


router.get("/login", async (req, res) => {
    res.render('pages/Teacher/Login');
});


// Define a route for handling teacher signup requests
router.post("/login", async (req, res) => {
    try {
        // Extract username and password from the request body
        const { email, password } = req.body;

        console.log(email, password);

        // Connect to the Oracle database
        const connection = await oracledb.getConnection(dbConfig);

        // Execute a query to check the username and password
        const result = await connection.execute(
            `SELECT * FROM teacher WHERE email = :email AND password = :password`,
            [email, password],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        //console.log(result.rows);

        // Close the database connection
        await connection.close();

        // Check if the query result has any rows
        if (result.rows.length > 0) {
            // If login is successful, redirect to a new HTML
            req.session.userId = result.rows[0].TEACHER_ID;
            req.session.userType='teacher';
            res.redirect("/teacher");
            console.log(result.rows);
        } else {
            // If login fails, send an error message
            res.status(401).json({ error: "Incorrect username or password" });
            //res.redirect('/teacher_login.html');
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/signup", (req, res) => {
    res.render('pages/Teacher/Signup');
});

//Teacher signup route
router.post("/signup", async (req, res) => {
    try {
        // Extract new user details from the request body
        const { newPassword, email, firstName, lastName } = req.body;

        console.log(newPassword, email, firstName, lastName);
        // Connect to the Oracle database
        const connection = await oracledb.getConnection(dbConfig);

        // Execute a query to insert a new user
        await connection.execute(
            `INSERT INTO Teacher (PASSWORD,FIRST_NAME,LAST_NAME,EMAIL) 
        VALUES (:newPassword,:firstName,:lastName,:email)`,
            { newPassword, firstName, lastName, email }
        );

        await connection.commit();

        // Close the database connection
        await connection.close();

        // Respond with a success message
        res.status(200).json({ message: "Signup successful" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


router.get("/profile", async (req, res) => {
	try {
		const connection = await oracledb.getConnection(dbConfig);
		const teacher = await connection.execute(
			`SELECT * FROM Teacher where teacher_id = 1`, {}
		);

		await connection.close();

		res.render('pages/Teacher/Profile.ejs', { user: teacher.rows });

	}
	catch (err) {
		console.log(err);
	}
});


router.post("/update-profile", async (req, res) => {
	try {
		const credentials = req.body;

		// Process the data as needed (e.g., update the teacher's profile in the database)
		console.log(req.body);
		// Send a response back to the client
		res.status(200).json({ message: 'Profile updated successfully' })
		//data is comming to server successfully
		//Now store the teacher id and use that to insert into the database
	}
	catch (err) {
		console.log(err);
	}
});




module.exports = router;