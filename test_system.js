/**
 * Automated End-to-End Test Suite for Exam Management System
 */
const http = require('http');
const db = require('./db');
const { app } = require('./server');

const TEST_PORT = 3001;
let server;

// Helper to make HTTP requests with cookie support
function request(method, path, options = {}) {
    return new Promise((resolve, reject) => {
        const headers = options.headers || {};
        let bodyData = options.body;

        if (bodyData && typeof bodyData === 'object' && !(bodyData instanceof Buffer)) {
            bodyData = JSON.stringify(bodyData);
            headers['Content-Type'] = 'application/json';
        }

        if (bodyData) {
            headers['Content-Length'] = Buffer.byteLength(bodyData);
        }

        if (options.cookies) {
            headers['Cookie'] = options.cookies.join('; ');
        }

        const req = http.request(
            {
                hostname: 'localhost',
                port: TEST_PORT,
                path,
                method,
                headers
            },
            (res) => {
                let chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const text = buffer.toString('utf8');
                    let json = null;
                    try {
                        json = JSON.parse(text);
                    } catch (e) { }

                    const setCookie = res.headers['set-cookie'] || [];
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        cookies: setCookie.map(c => c.split(';')[0]),
                        text,
                        json
                    });
                });
            }
        );

        req.on('error', reject);
        if (bodyData) {
            req.write(bodyData);
        }
        req.end();
    });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion Failed: ${message}`);
    }
}

async function runTests() {
    console.log('====================================================');
    console.log(' Starting Exam Management System Automated Tests ');
    console.log('====================================================');

    await db.initPool();

    await new Promise((resolve) => {
        server = app.listen(TEST_PORT, () => {
            console.log(`Test server running on port ${TEST_PORT}`);
            resolve();
        });
    });

    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            process.stdout.write(`TEST: ${name}... `);
            await fn();
            console.log('✓ PASSED');
            passed++;
        } catch (err) {
            console.log('✗ FAILED');
            console.error(err);
            failed++;
        }
    }

    try {
        // Test 1: Home Page
        await test('Home Page returns 200 and loads HTML', async () => {
            const res = await request('GET', '/');
            assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
            assert(/Exam Management System/i.test(res.text), 'Homepage HTML content missing');
        });

        // Test 2: Database Connection & Seed Check
        await test('Database Connection Pool functions and tables exist', async () => {
            const res = await db.execute('SELECT COUNT(*) AS CNT FROM STUDENT');
            assert(res.rows && res.rows.length > 0, 'No rows returned');
            assert(res.rows[0].CNT >= 1, `Expected at least 1 student, got ${res.rows[0].CNT}`);
        });

        // Test 3: Student Authentication
        let studentCookies = [];
        const studentEmail = `student_test_${Date.now()}@example.com`;
        await test('Student Signup and Login', async () => {
            const signupRes = await request('POST', '/student/signup', {
                headers: { 'Accept': 'application/json' },
                body: {
                    newPassword: 'testpass123',
                    email: studentEmail,
                    firstName: 'Automated',
                    lastName: 'Tester',
                    userClass: 'Undergraduate',
                    age: 20
                }
            });
            assert(signupRes.statusCode === 200, `Signup failed with status ${signupRes.statusCode}`);

            const loginRes = await request('POST', '/student/login', {
                headers: { 'Accept': 'application/json' },
                body: {
                    email: studentEmail,
                    password: 'testpass123'
                }
            });
            assert(loginRes.statusCode === 200, `Login failed with status ${loginRes.statusCode}`);
            assert(loginRes.cookies.length > 0, 'No session cookies returned');
            studentCookies = loginRes.cookies;
        });

        // Test 4: Teacher Authentication
        let teacherCookies = [];
        const teacherEmail = `teacher_test_${Date.now()}@example.com`;
        await test('Teacher Signup and Login', async () => {
            const signupRes = await request('POST', '/teacher/signup', {
                headers: { 'Accept': 'application/json' },
                body: {
                    newPassword: 'teacherpass123',
                    email: teacherEmail,
                    firstName: 'Prof',
                    lastName: 'Automated'
                }
            });
            assert(signupRes.statusCode === 200, `Teacher signup failed with status ${signupRes.statusCode}`);

            const loginRes = await request('POST', '/teacher/login', {
                headers: { 'Accept': 'application/json' },
                body: {
                    email: teacherEmail,
                    password: 'teacherpass123'
                }
            });
            assert(loginRes.statusCode === 200, `Teacher login failed with status ${loginRes.statusCode}`);
            assert(loginRes.cookies.length > 0, 'No teacher session cookies returned');
            teacherCookies = loginRes.cookies;
        });

        // Test 5: Profile retrieval and update
        await test('Student and Teacher Profile Updates', async () => {
            const sProfileRes = await request('GET', '/student/profile', { cookies: studentCookies });
            assert(sProfileRes.statusCode === 200, 'Student profile GET failed');

            const sUpdateRes = await request('POST', '/student/update-profile', {
                cookies: studentCookies,
                body: {
                    firstName: 'UpdatedStudentName',
                    lastName: 'Tester'
                }
            });
            assert(sUpdateRes.statusCode === 200, 'Student profile update failed');

            const tProfileRes = await request('GET', '/teacher/profile', { cookies: teacherCookies });
            assert(tProfileRes.statusCode === 200, 'Teacher profile GET failed');

            const tUpdateRes = await request('POST', '/teacher/update-profile', {
                cookies: teacherCookies,
                body: {
                    firstName: 'UpdatedTeacherName',
                    lastName: 'Automated'
                }
            });
            assert(tUpdateRes.statusCode === 200, 'Teacher profile update failed');
        });

        // Test 6: Topics and Subjects
        const testSubject = `TestSubject_${Date.now()}`;
        const testTopic = `TestTopic_${Date.now()}`;
        await test('Subject & Topic Creation and Retrieval', async () => {
            const subRes = await request('POST', '/teacher/create-subject', {
                cookies: teacherCookies,
                headers: { 'Accept': 'application/json' },
                body: {
                    subjectName: testSubject,
                    subjectDescription: 'A subject created during automated tests.'
                }
            });
            assert(subRes.statusCode === 200, 'Create subject failed');

            const topRes = await request('POST', '/teacher/create-topic', {
                cookies: teacherCookies,
                headers: { 'Accept': 'application/json' },
                body: {
                    topicName: testTopic,
                    subjectName: testSubject,
                    topicDescription: 'A topic created during automated tests.'
                }
            });
            assert(topRes.statusCode === 200, 'Create topic failed');

            const getTopicsRes = await request('GET', '/student/get-all-topics', { cookies: studentCookies });
            assert(getTopicsRes.statusCode === 200, 'Get all topics failed');
            assert(Array.isArray(getTopicsRes.json), 'Expected topics array');
            const found = getTopicsRes.json.some(t => t.TOPIC_NAME === testTopic);
            assert(found, `Newly created topic ${testTopic} not found in get-all-topics`);
        });

        // Test 7: Question and Question Set Creation
        await test('Question and Question Set Creation with Search', async () => {
            const createQRes = await request('POST', '/teacher/create-question', {
                cookies: teacherCookies,
                body: {
                    questionType: 'MCQ',
                    questionBody: 'What is 10 + 20?',
                    options: ['10', '20', '30', '40'],
                    correctAnswer: '30',
                    academicLevel: 'Undergraduate',
                    selectedTopic: testTopic
                }
            });
            assert(createQRes.statusCode === 200, 'Create question failed');

            const searchQRes = await request('GET', `/teacher/search-questions-by-topic?selectedTopics=${testTopic}`, {
                cookies: teacherCookies
            });
            assert(searchQRes.statusCode === 200, 'Search questions failed');
            assert(Array.isArray(searchQRes.json) && searchQRes.json.length > 0, 'No questions returned for topic');
            const questionId = searchQRes.json[0].QUESTION_ID;

            const createQSRes = await request('POST', '/teacher/create-question-set', {
                cookies: teacherCookies,
                body: {
                    questionSetName: `Set_${Date.now()}`,
                    selectedQuestions: [{ questionId, mark: 5 }]
                }
            });
            assert(createQSRes.statusCode === 200, 'Create question set failed');
        });

        // Test 8: Exam Scheduling and Student Submission
        await test('Exam Scheduling and Student Exam Submission', async () => {
            const qsRes = await db.execute('SELECT QUESTION_SET_ID FROM QUESTION_SET WHERE ROWNUM = 1');
            const questionSetId = qsRes.rows[0].QUESTION_SET_ID;

            const createExamRes = await request('POST', '/teacher/create-exam', {
                cookies: teacherCookies,
                headers: { 'Accept': 'application/json' },
                body: {
                    examName: 'Automated Test Exam',
                    examDate: '2026-10-15T10:00',
                    examDuration: 45,
                    academicLevel: 'Undergraduate',
                    questionSet: questionSetId
                }
            });
            assert(createExamRes.statusCode === 200, 'Create exam failed');

            const latestExamRes = await db.execute('SELECT EXAM_ID FROM (SELECT EXAM_ID FROM EXAM ORDER BY EXAM_ID DESC) WHERE ROWNUM = 1');
            const examId = latestExamRes.rows[0].EXAM_ID;

            // Student views exams
            const studentExamsRes = await request('GET', '/student/exams', { cookies: studentCookies });
            assert(studentExamsRes.statusCode === 200, 'Student exams list failed');

            // Student submits answer
            const qRow = await db.execute('SELECT QUESTION_ID FROM QUESTION WHERE ROWNUM = 1');
            const testQId = qRow.rows[0].QUESTION_ID;

            const submitAnswerRes = await request('POST', `/student/exams/${examId}/submit-exam-answer`, {
                cookies: studentCookies,
                body: [
                    { QUESTION_ID: testQId, GIVEN_ANSWER: 'True' }
                ]
            });
            assert(submitAnswerRes.statusCode === 200, 'Student submit exam answer failed');

            // Verify participation in database
            const partCheck = await db.execute(
                `SELECT * FROM EXAM_PARTICIPATION WHERE EXAM_ID = :examId`,
                { examId }
            );
            assert(partCheck.rows && partCheck.rows.length > 0, 'Participation not recorded in DB');
        });

        // Test 9: Assignment creation and retrieval
        await test('Assignment Creation and Student Listing', async () => {
            const createAssignRes = await request('POST', '/teacher/create-assignment', {
                cookies: teacherCookies,
                headers: { 'Accept': 'application/json' },
                body: {
                    assignmentName: 'Midterm Research Paper',
                    topicName: testTopic,
                    levelName: 'Undergraduate',
                    assignmentDetails: 'Submit 5 pages on database transactions.',
                    submissionDeadline: '2026-11-01T23:59',
                    totalMarks: 50
                }
            });
            assert(createAssignRes.statusCode === 200, 'Create assignment failed');

            const getAssignRes = await request('GET', '/student/assignments', { cookies: studentCookies });
            assert(getAssignRes.statusCode === 200, 'Get student assignments failed');
            assert(getAssignRes.text.includes('Midterm Research Paper'), 'Created assignment not listed in student assignments');
        });

        // Test 10: Connection Pool Concurrency & Leak Stress Test
        await test('Concurrent requests do not leak connections', async () => {
            const promises = [];
            for (let i = 0; i < 25; i++) {
                promises.push(request('GET', '/student/get-all-topics', { cookies: studentCookies }));
            }
            const results = await Promise.all(promises);
            for (const r of results) {
                assert(r.statusCode === 200, `Concurrent request failed with ${r.statusCode}`);
            }
        });

        // Test 11: Auto-Grading Accuracy Verification
        await test('Auto-Grading accurately calculates question marks', async () => {
            // 1. Create a dedicated test question with known answer and marks
            const createQRes = await request('POST', '/teacher/create-question', {
                cookies: teacherCookies,
                body: {
                    questionType: 'MCQ',
                    questionBody: 'What is the standard SQL command to retrieve data?',
                    options: ['SELECT', 'EXTRACT', 'GET', 'RETRIEVE'],
                    correctAnswer: 'SELECT',
                    academicLevel: 'Undergraduate',
                    selectedTopic: testTopic
                }
            });
            assert(createQRes.statusCode === 200, 'Create auto-grade question failed');

            const qRow = await db.execute("SELECT QUESTION_ID FROM QUESTION WHERE QUESTION_BODY LIKE '%standard SQL command%'");
            const qId = qRow.rows[0].QUESTION_ID;

            // 2. Create question set with this question worth 10 marks
            const createQSRes = await request('POST', '/teacher/create-question-set', {
                cookies: teacherCookies,
                body: {
                    questionSetName: `AutoGrade_Set_${Date.now()}`,
                    selectedQuestions: [{ questionId: qId, mark: 10 }]
                }
            });
            assert(createQSRes.statusCode === 200, 'Create question set failed');

            const qsRow = await db.execute("SELECT QUESTION_SET_ID FROM QUESTION_SET WHERE QUESTION_SET_NAME LIKE 'AutoGrade_Set_%'");
            const qsId = qsRow.rows[0].QUESTION_SET_ID;

            // 3. Schedule exam
            await request('POST', '/teacher/create-exam', {
                cookies: teacherCookies,
                headers: { 'Accept': 'application/json' },
                body: {
                    examName: 'AutoGrade Verification Exam',
                    examDate: '2026-10-20T10:00',
                    examDuration: 30,
                    academicLevel: 'Undergraduate',
                    questionSet: qsId
                }
            });

            const examRow = await db.execute('SELECT EXAM_ID FROM (SELECT EXAM_ID FROM EXAM ORDER BY EXAM_ID DESC) WHERE ROWNUM = 1');
            const autoExamId = examRow.rows[0].EXAM_ID;

            // 4. Submit correct answer: 'SELECT'
            const submitCorrectRes = await request('POST', `/student/exams/${autoExamId}/submit-exam-answer`, {
                cookies: studentCookies,
                body: [{ QUESTION_ID: qId, GIVEN_ANSWER: 'SELECT' }]
            });
            assert(submitCorrectRes.statusCode === 200, 'Submit answer failed');

            // 5. Verify database stored 10 marks and IS_CORRECT = 1
            const partCheck = await db.execute('SELECT OBTAINED_MARKS FROM EXAM_PARTICIPATION WHERE EXAM_ID = :autoExamId', { autoExamId });
            assert(partCheck.rows && partCheck.rows[0].OBTAINED_MARKS === 10, `Expected 10 marks, got: ${partCheck.rows && partCheck.rows[0].OBTAINED_MARKS}`);

            const answerCheck = await db.execute('SELECT IS_CORRECT, OBTAINED_MARKS FROM EXAM_ANSWER WHERE EXAM_ID = :autoExamId AND QUESTION_ID = :qId', { autoExamId, qId });
            assert(answerCheck.rows && answerCheck.rows[0].IS_CORRECT === 1, 'IS_CORRECT should be 1');
            assert(answerCheck.rows && answerCheck.rows[0].OBTAINED_MARKS === 10, 'OBTAINED_MARKS should be 10');
        });

        // Test 12: Student Practice Exam Creation (Null FK Safety)
        await test('Student Practice Exam Creation with Null Foreign Key', async () => {
            const qsRow = await db.execute('SELECT QUESTION_SET_ID FROM QUESTION_SET WHERE ROWNUM = 1');
            const qsId = qsRow.rows[0].QUESTION_SET_ID;

            const practiceRes = await request('POST', '/student/create-exam', {
                cookies: studentCookies,
                headers: { 'Accept': 'application/json' },
                body: {
                    examDate: '2026-10-20T14:00',
                    examDuration: 25,
                    academicLevel: 'Undergraduate',
                    questionSet: qsId
                }
            });
            assert(practiceRes.statusCode === 200, 'Student practice exam creation failed');

            const latestExam = await db.execute('SELECT EXAM_TYPE, SCHEDULED_BY FROM (SELECT * FROM EXAM ORDER BY EXAM_ID DESC) WHERE ROWNUM = 1');
            assert(latestExam.rows[0].EXAM_TYPE === 'Practice', 'Exam type should be Practice');
            assert(latestExam.rows[0].SCHEDULED_BY === null, 'SCHEDULED_BY should be NULL for student practice exam');
        });

        // Test 13: Student Assignment Details Grade & Feedback Retrieval
        await test('Student Assignment Details Displays Grade and Feedback', async () => {
            const assignRes = await db.execute('SELECT ASSIGNMENT_ID FROM (SELECT ASSIGNMENT_ID FROM ASSIGNMENT ORDER BY ASSIGNMENT_ID DESC) WHERE ROWNUM = 1');
            const assignId = assignRes.rows[0].ASSIGNMENT_ID;

            // Teacher grades student assignment with 45 marks and review feedback
            const studentIdRes = await db.execute('SELECT STUDENT_ID FROM STUDENT WHERE EMAIL = :email', { email: studentEmail });
            const sId = studentIdRes.rows[0].STUDENT_ID;

            // Ensure submission row exists with commit
            await db.withTransaction(async (conn) => {
                await conn.execute(
                    `MERGE INTO ASSIGNMENT_SUBMISSION sub
                     USING DUAL ON (sub.STUDENT_ID = :sId AND sub.ASSIGNMENT_ID = :assignId)
                     WHEN MATCHED THEN UPDATE SET MARKS_OBTAINED = 45, FEEDBACK = 'Excellent architectural analysis'
                     WHEN NOT MATCHED THEN INSERT (STUDENT_ID, ASSIGNMENT_ID, MARKS_OBTAINED, FEEDBACK, SUBMISSION_TIME)
                     VALUES (:sId, :assignId, 45, 'Excellent architectural analysis', SYSDATE)`,
                    { sId, assignId }
                );
            });

            const detailsRes = await request('GET', `/student/assignments/${assignId}`, { cookies: studentCookies });
            assert(detailsRes.statusCode === 200, 'Student assignment details page failed');
            assert(detailsRes.text.includes('45'), 'Student assignment details should display 45 marks');
            assert(detailsRes.text.includes('Excellent architectural analysis'), 'Student assignment details should display instructor feedback');
        });

        // Test 14: Teacher Exam Analytics View
        await test('Teacher Exam Analytics Displays Performance Metrics', async () => {
            const examRes = await db.execute('SELECT EXAM_ID FROM (SELECT EXAM_ID FROM EXAM ORDER BY EXAM_ID DESC) WHERE ROWNUM = 1');
            const examId = examRes.rows[0].EXAM_ID;

            const examViewRes = await request('GET', `/teacher/exams/${examId}`, { cookies: teacherCookies });
            assert(examViewRes.statusCode === 200, 'Teacher exam details page failed');
            assert(examViewRes.text.includes('Exam Performance & Submissions'), 'Header should be updated with Exam Performance & Submissions');
            assert(examViewRes.text.includes('Class Average Score'), 'Should include Class Average Score metric');
        });

        // Test 15: Bcrypt Password Hashing Verification
        await test('Bcrypt Password Hashing & Transparent Upgrade', async () => {
            const checkPass = await db.execute('SELECT PASSWORD FROM STUDENT WHERE EMAIL = :email', { email: studentEmail });
            assert(checkPass.rows && checkPass.rows.length > 0, 'Student should exist');
            const storedHash = checkPass.rows[0].PASSWORD;
            assert(storedHash.startsWith('$2'), 'Student password in Oracle must be a bcrypt hash (starts with $2)');
        });

        // Test 16: Role-Based Access Control (RBAC) Guard Enforcement
        await test('Role-Based Access Control (RBAC) Guard Enforcement', async () => {
            // Student attempting to access /admin/ should get 403
            const forbiddenRes = await request('GET', '/admin/', { cookies: studentCookies });
            assert(forbiddenRes.statusCode === 403, 'Student must receive 403 Forbidden when accessing /admin/');

            // Unauthenticated user attempting to access /admin/ should get 403
            const unauthRes = await request('GET', '/admin/');
            assert(unauthRes.statusCode === 403, 'Unauthenticated user must receive 403 Forbidden when accessing /admin/');
        });

        // Test 17: Oracle PL/SQL Stored Procedure Auto-Grading Execution
        await test('Oracle PL/SQL EVALUATE_EXAM_SUBMISSION Execution', async () => {
            const oracledb = require('oracledb');
            const testExamRes = await db.execute('SELECT EXAM_ID FROM (SELECT EXAM_ID FROM EXAM ORDER BY EXAM_ID DESC) WHERE ROWNUM = 1');
            const testExamId = testExamRes.rows[0].EXAM_ID;
            const testStudentRes = await db.execute('SELECT STUDENT_ID FROM (SELECT STUDENT_ID FROM STUDENT ORDER BY STUDENT_ID DESC) WHERE ROWNUM = 1');
            const testStudentId = testStudentRes.rows[0].STUDENT_ID;

            const plsqlResult = await db.execute(
                `BEGIN
                    EVALUATE_EXAM_SUBMISSION(:sid, :eid, :outScore);
                 END;`,
                {
                    sid: testStudentId,
                    eid: testExamId,
                    outScore: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                }
            );
            assert(plsqlResult.outBinds.outScore !== undefined, 'PL/SQL stored procedure must output evaluated score');
        });

        // Test 18: Admin Teacher Approval Workflow
        await test('Admin Portal Faculty Approval Workflow', async () => {
            const tempEmail = `pending_faculty_${Date.now()}@buet.ac.bd`;
            await db.withTransaction(async (conn) => {
                await conn.execute(
                    `INSERT INTO TEACHER (FIRST_NAME, LAST_NAME, EMAIL, PASSWORD, APPROVAL_STATUS)
                     VALUES ('Pending', 'Prof', :tempEmail, 'password123', 0)`,
                    { tempEmail }
                );
            });

            const insertedTeacher = await db.execute('SELECT TEACHER_ID FROM TEACHER WHERE EMAIL = :tempEmail', { tempEmail });
            const pId = insertedTeacher.rows[0].TEACHER_ID;

            // Log in as Admin (Mukdho Zaman)
            const adminLoginRes = await request('POST', '/teacher/login', {
                body: { email: 'mukdho.zaman@gmail.com', password: 'admin123456' }
            });
            const adminCookies = adminLoginRes.cookies || [];

            // Admin views dashboard
            const adminDashRes = await request('GET', '/admin/', { cookies: adminCookies });
            assert(adminDashRes.statusCode === 200, 'Admin dashboard should return 200');
            assert(adminDashRes.text.includes(tempEmail), 'Pending faculty should appear on admin dashboard');

            // Admin approves teacher
            const approveRes = await request('POST', `/admin/teachers/${pId}/approve`, { cookies: adminCookies });
            assert(approveRes.statusCode === 302 || approveRes.statusCode === 200, 'Approve action should succeed');

            // Verify teacher status in DB
            const verifyStatus = await db.execute('SELECT APPROVAL_STATUS FROM TEACHER WHERE TEACHER_ID = :pId', { pId });
            assert(verifyStatus.rows[0].APPROVAL_STATUS === 1, 'Faculty APPROVAL_STATUS must be updated to 1');
        });

    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        await db.closePool();
    }

    console.log('====================================================');
    console.log(` Test Results: ${passed} passed, ${failed} failed `);
    console.log('====================================================');

    if (failed > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    runTests().catch(err => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
}

module.exports = runTests;
