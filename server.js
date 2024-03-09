// Import required modules
const express = require("express");
const oracledb = require("oracledb");
const session = require("express-session");
const CircularJSON = require("circular-json");

//This will set the oracledb sql executions to return JSON files
oracledb.outFormat = oracledb.OBJECT;

// Define Oracle database connection details
const dbConfig = require("./dbconfig");

const requireLogin = require('./middleware/requireLogin');

// Create an Express application
const app = express();
app.use(
	session({
		secret: "mykey", // Change this to a secret key
		resave: false,
		saveUninitialized: true,
	})
);

//const connection = undefined;
//this function will execute the sql query and return the json array of results
// async function runquery(Query, param) {
//   if (connection === undefined) {
//     connection = await oracledb.getConnection(dbConfig);
//   }

//   try {
//     const result = await connection.execute(Query, param);
//     return result.rows;
//   } catch (err) {
//     console.log(err);
//   }
// }


// Middleware to check if user is logged in
// const requireLogin = (req, res, next) => {
//     if (!req.session.userId || !req.session.userType) {
//         res.redirect('/login'); // Redirect to login page if user is not logged in
//     } else {
//         next(); // Continue to next middleware/route handler
//     }
// };

//Set up express app to use ejs as view engine
app.set('view engine', 'ejs');

// Set up middleware to parse sent data into json requests
app.use(express.json());
//This is needed for html post form request.
app.use(express.urlencoded({ extended: true }));



//Apply routes to pages
const studentroutes = require("./routes/students_routes");
const student_assignment = require("./routes/student_assignment");
const student_exam = require("./routes/student_exam");
const student_question_practice = require("./routes/student_question_practice");


const teacherroutes = require("./routes/teachers_routes");
const teacher_assignment = require("./routes/teacher_assignment");
const teacher_exam = require("./routes/teacher_exam");
const teacher_question_manage = require("./routes/teacher_question_manage");
const teacher_subject_topic = require("./routes/teacher_subject_topic");


app.use("/student", studentroutes);
app.use("/student", student_assignment);
app.use("/student", student_exam);
app.use("/student", student_question_practice);

app.use("/teacher", teacherroutes);
app.use("/teacher", teacher_assignment);
app.use("/teacher", teacher_exam);
app.use("/teacher", teacher_question_manage);
app.use("/teacher", teacher_subject_topic);



app.get("/", (req, res) => {
	res.sendFile(__dirname + "/Static/homepage.html");
	//res.render("./pages/Topic_creation.ejs",{questions:[]});
});

app.get("/admin/login", (req, res) => {
	res.sendFile(__dirname + "/Static/Admin/Login.html");
});

app.post("/admin/login", (req, res) => {
	const { username, password } = req.body;
	console.log(username, password);
	res.status(200);
});


// Start the Express server
const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server is running on  http://localhost:${port}`);
});
