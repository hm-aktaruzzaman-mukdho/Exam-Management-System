const express = require('express');
const router = express.Router();
const oracledb = require("oracledb");

const dbConfig = require('../dbconfig');

const requireLogin = require('../middleware/requireLogin');

// Serve the success HTML page
router.get("/", async (req, res) => {
  try {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT * FROM TOPIC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const subjects = await connection.execute(
      `SELECT * FROM Subject`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Closing the connection
    await connection.close();

  res.render('pages/Student/Dashboard',{topics:result.rows,subjects:subjects.rows});
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/login", (req, res) => {
  res.render("pages/Student/Login");
});

// Define a route for handling login requests
router.post("/login", async (req, res) => {
  try {
    // Extract username and password from the request body
    const { email, password } = req.body;

    console.log(email, password);

    // Connect to the Oracle database
    const connection = await oracledb.getConnection(dbConfig);

    // Execute a query to check the username and password
    const result = await connection.execute(
      `SELECT * FROM student WHERE email = :email AND password = :password`,
      [email, password],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(result.rows);

    // Close the database connection
    //await connection.close();

    // Check if the query result has any rows
    if (result.rows.length > 0) {
      // If login is successful, redirect to a new HTML page
      req.session.userId=result.rows[0].STUDENT_ID;
      req.session.userType='student';
      res.redirect("/student");
    } else {
      // If login fails, send an error message
      res.status(401).json({ error: "Incorrect username or password" });
      //res.redirect('/student/login');
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    // if (connection) {
    //   try {
    //     await connection.close();
    //   } catch (err) {
    //     console.log(err);
    //   }
    // }
  }
});

router.get("/signup",(req,res) => {
  res.render('pages/Student/Signup');
});

// Define a route for handling signup requests
router.post("/signup", async (req, res) => {
  try {
    // Extract new user details from the request body
    const { newPassword, email, firstName, lastName, userClass, age } =
      req.body;

    console.log(newPassword, email, firstName, lastName, userClass, age);
    // Connect to the Oracle database
    const connection = await oracledb.getConnection(dbConfig);

    // Execute a query to insert a new user
    await connection.execute(
      `INSERT INTO STUDENT (PASSWORD,FIRST_NAME,LAST_NAME,EMAIL,AGE,LEVEL_NAME) 
      VALUES (:newPassword,:firstName,:lastName,:email,:age,:userClass)`,
      { newPassword, firstName, lastName, email, age, userClass }
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






router.get("/profile",requireLogin, async (req, res) => {
  try {
    //connect to database
    const connection = await oracledb.getConnection(dbConfig);
    const sid = req.session.userId;
    const result = await connection.execute(
      `SELECT * FROM Student where student_id=${sid}`,
      {}
    );

    // Closing the connection
    await connection.close();
    // console.log(typeof(result));
    // console.log(result.rows[0].FIRST_NAME);

    res.render('./pages/Student/Profile', { student: result.rows });

    //res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



module.exports = router;