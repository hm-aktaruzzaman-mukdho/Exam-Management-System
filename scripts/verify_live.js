const http = require('http');

function postJson(path, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let resBody = '';
            res.on('data', c => resBody += c);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    cookies: res.headers['set-cookie'] || [],
                    body: resBody
                });
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function get(path, cookies = []) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path,
            method: 'GET',
            headers: {
                'Cookie': cookies.map(c => c.split(';')[0]).join('; ')
            }
        }, (res) => {
            let resBody = '';
            res.on('data', c => resBody += c);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: resBody
                });
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function verify() {
    console.log('--- Testing Student Flow ---');
    const studentLogin = await postJson('/student/login', {
        email: 'mobasharul.islam@gmail.com',
        password: '123'
    });
    console.log('Student Login Status:', studentLogin.statusCode);
    const studentDashboard = await get('/student', studentLogin.cookies);
    console.log('Student Dashboard Status:', studentDashboard.statusCode);
    console.log('Student Dashboard Rendered:', studentDashboard.body.includes('Student Home Page'));

    console.log('\n--- Testing Teacher Flow ---');
    const teacherLogin = await postJson('/teacher/login', {
        email: 'mukdho.zaman@gmail.com',
        password: 'admin123456'
    });
    console.log('Teacher Login Status:', teacherLogin.statusCode);
    const teacherDashboard = await get('/teacher', teacherLogin.cookies);
    console.log('Teacher Dashboard Status:', teacherDashboard.statusCode);
    console.log('Teacher Dashboard Rendered:', teacherDashboard.body.includes('Teacher Dashboard'));

    console.log('\nAll live HTTP checks completed successfully!');
}

verify().catch(console.error);
