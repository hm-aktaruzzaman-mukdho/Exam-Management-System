// Import required modules
const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const db = require("./db");

// Create an Express application
const app = express();

// Ensure upload directories exist
const uploadDirs = [
    path.join(__dirname, "uploads"),
    path.join(__dirname, "uploads", "Assignment_Answer"),
    path.join(__dirname, "uploads", "Assignment_Question")
];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure Session
app.use(
    session({
        secret: process.env.SESSION_SECRET || "exam-management-secure-secret-key-2026",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        }
    })
);

// Set up express app to use ejs as view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, "Static")));
app.use("/Static", express.static(path.join(__dirname, "Static")));
app.use("/css", express.static(path.join(__dirname, "Static", "css")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Apply routes
const studentroutes = require("./routes/students_routes");
const student_assignment = require("./routes/student_assignment");
const student_exam = require("./routes/student_exam");
const student_question_practice = require("./routes/student_question_practice");
const student_topic_subject = require("./routes/student_topic_subject");

const teacherroutes = require("./routes/teachers_routes");
const teacher_assignment = require("./routes/teacher_assignment");
const teacher_exam = require("./routes/teacher_exam");
const teacher_question_manage = require("./routes/teacher_question_manage");
const teacher_subject_topic = require("./routes/teacher_subject_topic");
const adminRoutes = require("./routes/admin_routes");

// Mount student routes
app.use("/student", studentroutes);
app.use("/student", student_assignment);
app.use("/student", student_exam);
app.use("/student", student_question_practice);
app.use("/student", student_topic_subject);

// Direct topic/subject endpoints (for legacy frontend calls from Dashboard)
app.use("/", student_topic_subject);

// Mount teacher routes
app.use("/teacher", teacherroutes);
app.use("/teacher", teacher_assignment);
app.use("/teacher", teacher_exam);
app.use("/teacher", teacher_question_manage);
app.use("/teacher", teacher_subject_topic);

// Mount admin routes
app.use("/admin", adminRoutes);

// Home and common routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "Static", "homepage.html"));
});

// Logout endpoint
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});
app.get("/student/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/student/login");
    });
});
app.get("/teacher/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/teacher/login");
    });
});

app.get("/admin/login", (req, res) => {
    res.sendFile(path.join(__dirname, "Static", "Admin", "Login.html"));
});

app.post("/admin/login", (req, res) => {
    const { username, password } = req.body;
    console.log("Admin login attempt:", username);
    res.status(200).json({ message: "Admin login endpoint" });
});

// 404 Handler
app.use((req, res) => {
    if (req.accepts("html")) {
        return res.status(404).send("<h2>404 - Page Not Found</h2><p><a href='/'>Go to Home</a></p>");
    }
    res.status(404).json({ error: "Endpoint not found" });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled Application Error:", err);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({ error: "Internal Server Error" });
});

// Start the Express server
const port = process.env.PORT || 3000;
let server;

async function startServer() {
    try {
        await db.initPool();
        server = app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}

// Graceful shutdown
async function gracefulShutdown() {
    console.log("\nShutting down gracefully...");
    if (server) {
        server.close(async () => {
            console.log("HTTP server closed.");
            await db.closePool();
            process.exit(0);
        });
    } else {
        await db.closePool();
        process.exit(0);
    }
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
