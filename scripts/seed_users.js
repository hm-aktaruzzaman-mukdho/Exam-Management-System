const db = require('../db');

async function seedUsers() {
    try {
        await db.withTransaction(async (conn) => {
            // Student: Mobasharul Islam
            const studentCheck = await conn.execute(
                `SELECT STUDENT_ID FROM STUDENT WHERE EMAIL = 'mobasharul.islam@gmail.com'`
            );
            if (!studentCheck.rows || studentCheck.rows.length === 0) {
                await conn.execute(
                    `INSERT INTO STUDENT (PASSWORD, FIRST_NAME, LAST_NAME, EMAIL, AGE, LEVEL_NAME)
                     VALUES ('123', 'Mobasharul', 'Islam', 'mobasharul.islam@gmail.com', 21, 'Undergraduate')`
                );
                console.log('Created student: mobasharul.islam@gmail.com');
            } else {
                await conn.execute(
                    `UPDATE STUDENT SET PASSWORD = '123' WHERE EMAIL = 'mobasharul.islam@gmail.com'`
                );
                console.log('Updated student password for mobasharul.islam@gmail.com');
            }

            // Teacher: Mukdho Zaman
            const teacherCheck = await conn.execute(
                `SELECT TEACHER_ID FROM TEACHER WHERE EMAIL = 'mukdho.zaman@gmail.com'`
            );
            if (!teacherCheck.rows || teacherCheck.rows.length === 0) {
                await conn.execute(
                    `INSERT INTO TEACHER (PASSWORD, FIRST_NAME, LAST_NAME, EMAIL, APPROVAL_STATUS, IS_ADMIN)
                     VALUES ('admin123456', 'H M Aktaruzzaman', 'Mukdho', 'mukdho.zaman@gmail.com', 1, 1)`
                );
                console.log('Created teacher: mukdho.zaman@gmail.com');
            } else {
                await conn.execute(
                    `UPDATE TEACHER SET PASSWORD = 'admin123456' WHERE EMAIL = 'mukdho.zaman@gmail.com'`
                );
                console.log('Updated teacher password for mukdho.zaman@gmail.com');
            }
        });
        console.log('Seed users completed successfully.');
    } catch (err) {
        console.error('Error seeding users:', err);
    } finally {
        await db.closePool();
    }
}

seedUsers();
