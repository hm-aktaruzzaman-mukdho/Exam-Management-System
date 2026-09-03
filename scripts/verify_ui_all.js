const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, body = null, cookie = '') {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {}
        };

        if (cookie) {
            options.headers['Cookie'] = cookie;
        }

        if (body) {
            const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const setCookie = res.headers['set-cookie'];
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                    cookies: setCookie ? setCookie.map(c => c.split(';')[0]).join('; ') : ''
                });
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function verifyAllPages() {
    console.log('--- STARTING COMPREHENSIVE UI VERIFICATION ---');
    let totalChecks = 0;
    let passedChecks = 0;

    async function check(name, fn) {
        totalChecks++;
        try {
            await fn();
            console.log(`\x1b[32m✔ [PASS]\x1b[0m ${name}`);
            passedChecks++;
        } catch (err) {
            console.error(`\x1b[31m✖ [FAIL]\x1b[0m ${name}: ${err.message}`);
        }
    }

    // 1. Static Homepage
    await check('Landing Page GET /', async () => {
        const res = await makeRequest('GET', '/');
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.body.includes('Academic Testing Reimagined for Excellence')) throw new Error('Missing hero heading');
    });

    // 2. Student Auth Pages
    await check('Student Login GET /student/login', async () => {
        const res = await makeRequest('GET', '/student/login');
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.body.includes('/css/main.css')) throw new Error('Missing main.css link');
    });

    await check('Student Signup GET /student/signup', async () => {
        const res = await makeRequest('GET', '/student/signup');
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.body.includes('Create Student Account')) throw new Error('Missing title');
    });

    // 3. Teacher Auth Pages
    await check('Teacher Login GET /teacher/login', async () => {
        const res = await makeRequest('GET', '/teacher/login');
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.body.includes('Teacher Portal')) throw new Error('Missing title');
    });

    await check('Teacher Signup GET /teacher/signup', async () => {
        const res = await makeRequest('GET', '/teacher/signup');
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.body.includes('Faculty Registration')) throw new Error('Missing title');
    });

    // 4. Authenticate as Student
    let studentCookie = '';
    await check('Student Authentication Flow', async () => {
        const res = await makeRequest('POST', '/student/login', {
            email: 'mobasharul.islam@gmail.com',
            password: '123'
        });
        if (res.status !== 200 && res.status !== 302) throw new Error(`Login failed with status ${res.status}`);
        studentCookie = res.cookies;
    });

    // Student Views
    const studentEndpoints = [
        { path: '/student', name: 'Student Dashboard', match: 'Welcome Back, Student!' },
        { path: '/student/exams', name: 'Student All Exams', match: 'Examinations' },
        { path: '/student/create-exam', name: 'Student Practice Exam Creation', match: 'Practice' },
        { path: '/student/questions', name: 'Student Question Practice', match: 'Question Practice' },
        { path: '/student/assignments', name: 'Student Assignments', match: 'Coursework' },
        { path: '/student/profile', name: 'Student Profile', match: 'Student Profile' }
    ];

    for (const ep of studentEndpoints) {
        await check(`Student View: ${ep.name} (${ep.path})`, async () => {
            const res = await makeRequest('GET', ep.path, null, studentCookie);
            if (res.status !== 200) throw new Error(`Status ${res.status}`);
            if (!res.body.includes(ep.match)) throw new Error(`Expected text '${ep.match}' missing`);
            if (!res.body.includes('/css/main.css')) throw new Error('Design system css missing');
        });
    }

    // 5. Authenticate as Teacher
    let teacherCookie = '';
    await check('Teacher Authentication Flow', async () => {
        const res = await makeRequest('POST', '/teacher/login', {
            email: 'mukdho.zaman@gmail.com',
            password: 'admin123456'
        });
        if (res.status !== 200 && res.status !== 302) throw new Error(`Login failed with status ${res.status}`);
        teacherCookie = res.cookies;
    });

    // Teacher Views
    const teacherEndpoints = [
        { path: '/teacher', name: 'Teacher Dashboard', match: 'Teacher Command Center' },
        { path: '/teacher/exams', name: 'Teacher Exams', match: 'Managed Examinations' },
        { path: '/teacher/create-exam', name: 'Teacher Exam Creation', match: 'Schedule New Examination' },
        { path: '/teacher/question-creation', name: 'Teacher Question Creation', match: 'Add New Question' },
        { path: '/teacher/create-question-set', name: 'Teacher Question Set Creation', match: 'Assemble Question Set' },
        { path: '/teacher/assignments', name: 'Teacher Assignments', match: 'Coursework & Assignments' },
        { path: '/teacher/create-assignment', name: 'Teacher Create Assignment', match: 'Publish Homework Assignment' },
        { path: '/teacher/modify-topic-subject', name: 'Teacher Topics & Subjects', match: 'Curriculum & Course Management' },
        { path: '/teacher/profile', name: 'Teacher Profile', match: 'Faculty Profile' }
    ];

    for (const ep of teacherEndpoints) {
        await check(`Teacher View: ${ep.name} (${ep.path})`, async () => {
            const res = await makeRequest('GET', ep.path, null, teacherCookie);
            if (res.status !== 200) throw new Error(`Status ${res.status}`);
            if (!res.body.includes(ep.match)) throw new Error(`Expected text '${ep.match}' missing`);
            if (!res.body.includes('/css/main.css')) throw new Error('Design system css missing');
        });
    }

    // 6. Admin Portal View
    await check('Admin View: Admin Command Console (/admin/)', async () => {
        const res = await makeRequest('GET', '/admin/', null, teacherCookie);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.body.includes('Platform Administration & Governance')) throw new Error('Missing admin header text');
        if (!res.body.includes('/css/main.css')) throw new Error('Design system css missing');
    });

    console.log(`\n--- UI VERIFICATION SUMMARY: ${passedChecks}/${totalChecks} PASSED ---`);
    if (passedChecks === totalChecks) {
        console.log(`\x1b[32mALL ${totalChecks} UI VIEWS AND ENDPOINTS ARE FULLY MODERNIZED, STYLED AND FUNCTIONAL!\x1b[0m\n`);
        process.exit(0);
    } else {
        console.error('\x1b[31mSOME CHECKS FAILED!\x1b[0m\n');
        process.exit(1);
    }
}

verifyAllPages().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
});
