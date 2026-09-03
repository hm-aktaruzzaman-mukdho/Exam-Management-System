const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
const dbConfig = require('../dbconfig');

async function runStatements(connection, sqlStatements, ignoreErrors = true) {
    for (let statement of sqlStatements) {
        statement = statement.trim();
        if (!statement || statement.startsWith('--')) continue;
        try {
            await connection.execute(statement);
        } catch (err) {
            if (!ignoreErrors) {
                console.error(`Error executing: ${statement.substring(0, 100)}...`, err.message);
            }
        }
    }
}

async function setupDatabase() {
    let connection;
    try {
        console.log('Connecting to Oracle DB...', dbConfig);
        connection = await oracledb.getConnection(dbConfig);
        console.log('Connected to Oracle DB successfully!');

        // 1. Ensure missing tables exist
        console.log('Creating any missing tables...');
        const createTableStatements = [
            `CREATE TABLE STUDENT_QUESTION_PRACTICE (
                STUDENT_ID NUMBER,
                QUESTION_ID NUMBER,
                ATTEMPTED_NUMBER NUMBER DEFAULT 0,
                GIVEN_ANSWER VARCHAR2(4000),
                IS_CORRECT NUMBER DEFAULT 0,
                PRIMARY KEY (STUDENT_ID, QUESTION_ID),
                FOREIGN KEY (STUDENT_ID) REFERENCES STUDENT(STUDENT_ID) ON DELETE CASCADE,
                FOREIGN KEY (QUESTION_ID) REFERENCES QUESTION(QUESTION_ID) ON DELETE CASCADE
            )`,
            `CREATE TABLE EXAM_ANSWER (
                STUDENT_ID NUMBER,
                QUESTION_ID NUMBER,
                EXAM_ID NUMBER,
                GIVEN_ANSWER VARCHAR2(4000),
                IS_CORRECT NUMBER DEFAULT 0,
                OBTAINED_MARKS NUMBER DEFAULT 0,
                PRIMARY KEY (STUDENT_ID, QUESTION_ID, EXAM_ID),
                FOREIGN KEY (STUDENT_ID) REFERENCES STUDENT(STUDENT_ID) ON DELETE CASCADE,
                FOREIGN KEY (QUESTION_ID) REFERENCES QUESTION(QUESTION_ID) ON DELETE CASCADE,
                FOREIGN KEY (EXAM_ID) REFERENCES EXAM(EXAM_ID) ON DELETE CASCADE
            )`
        ];
        for (const sql of createTableStatements) {
            try {
                await connection.execute(sql);
                console.log('Executed DDL successfully.');
            } catch (err) {
                // Table might already exist (ORA-00955)
                if (err.errorNum !== 955) {
                    console.log('DDL note:', err.message);
                }
            }
        }

        // Ensure IS_DELETED column exists on QUESTION
        try {
            await connection.execute(`ALTER TABLE QUESTION ADD (IS_DELETED NUMBER DEFAULT 0 CHECK(IS_DELETED=0 OR IS_DELETED=1))`);
        } catch (err) {
            // ORA-01430: column being added already exists in table
            if (err.errorNum !== 1430) {
                console.log('Column note:', err.message);
            }
        }

        // Ensure EXAM_NAME column exists on EXAM
        try {
            await connection.execute(`ALTER TABLE EXAM ADD (EXAM_NAME VARCHAR2(100))`);
        } catch (err) {
            if (err.errorNum !== 1430) {
                console.log('Column note:', err.message);
            }
        }

        // 2. Run seed SQL scripts from USED_SQL
        const seedFiles = [
            'Academic_level_data.sql',
            'Demo_Data_2_Question_Type.sql',
            'Subject_data.sql',
            'Demo_Data_6_Topic.sql',
            'Demo_Data_4_Teacher.sql',
            'Demo_Data_5_Student.sql',
            'Demo_Data_3.3_Question_TF.sql',
            'Demo_Data_7_Question_Set.sql',
            'Demo_Data_8_QUESTION_SET_QUESTION.sql',
            'Demo_Data_9_EXAM.sql'
        ];

        for (const file of seedFiles) {
            const filePath = path.join(__dirname, '../USED_SQL', file);
            if (fs.existsSync(filePath)) {
                console.log(`Seeding from ${file}...`);
                const content = fs.readFileSync(filePath, 'utf8');
                const statements = content
                    .split(/;\s*[\r\n]+/)
                    .map(s => s.replace(/;$/, '').trim())
                    .filter(s => s && !s.startsWith('--'));
                await runStatements(connection, statements, true);
                await connection.commit();
            }
        }

        // Insert sample assignments if none exist
        const assignCheck = await connection.execute('SELECT COUNT(*) AS CNT FROM ASSIGNMENT');
        const count = assignCheck.rows && assignCheck.rows[0] ? (assignCheck.rows[0].CNT || assignCheck.rows[0][0] || 0) : 0;
        if (count === 0) {
            console.log('Seeding sample assignments...');
            const teacherRes = await connection.execute('SELECT TEACHER_ID FROM TEACHER WHERE ROWNUM = 1');
            const tid = teacherRes.rows && teacherRes.rows.length > 0 ? (teacherRes.rows[0].TEACHER_ID || teacherRes.rows[0][0]) : 1;
            const topicRes = await connection.execute('SELECT TOPIC_NAME FROM TOPIC WHERE ROWNUM = 1');
            const topicName = topicRes.rows && topicRes.rows.length > 0 ? (topicRes.rows[0].TOPIC_NAME || topicRes.rows[0][0]) : 'General';
            
            await connection.execute(
                `INSERT INTO ASSIGNMENT (ASSIGNMENT_NAME, TOPIC_NAME, LEVEL_NAME, ASSIGNMENT_DETAILS, SUBMISSION_DEADLINE, TOTAL_MARKS, TEACHER_ID)
                 VALUES ('Calculus Integration Practice', :topicName, 'Undergraduate', 'Complete problems 1 through 10 from chapter 3.', SYSDATE + 7, 50, :tid)`,
                { topicName, tid }
            );
            await connection.execute(
                `INSERT INTO ASSIGNMENT (ASSIGNMENT_NAME, TOPIC_NAME, LEVEL_NAME, ASSIGNMENT_DETAILS, SUBMISSION_DEADLINE, TOTAL_MARKS, TEACHER_ID)
                 VALUES ('Physics Mechanics Lab Report', :topicName, 'Undergraduate', 'Submit lab report for pendulum experiment.', SYSDATE - 2, 100, :tid)`,
                { topicName, tid }
            );
            await connection.commit();
        }

        // 4. Compile PL/SQL stored procedures and triggers
        try {
            await connection.execute(`
CREATE OR REPLACE PROCEDURE EVALUATE_EXAM_SUBMISSION(
    p_student_id IN NUMBER,
    p_exam_id    IN NUMBER,
    p_total_score OUT NUMBER
) AS
    v_qset_id NUMBER;
BEGIN
    SELECT QUESTION_SET_ID INTO v_qset_id FROM EXAM WHERE EXAM_ID = p_exam_id;
    MERGE INTO EXAM_ANSWER ea
    USING (
        SELECT ea2.STUDENT_ID, ea2.EXAM_ID, ea2.QUESTION_ID,
            CASE WHEN LOWER(TRIM(ea2.GIVEN_ANSWER)) = LOWER(TRIM(q.CORRECT_ANSWER)) THEN 1 ELSE 0 END AS COMPUTED_IS_CORRECT,
            CASE WHEN LOWER(TRIM(ea2.GIVEN_ANSWER)) = LOWER(TRIM(q.CORRECT_ANSWER)) THEN NVL(qsq.MARK_OF_QUESTION, 1) ELSE 0 END AS COMPUTED_MARKS
        FROM EXAM_ANSWER ea2
        JOIN QUESTION q ON ea2.QUESTION_ID = q.QUESTION_ID
        LEFT JOIN QUESTION_SET_QUESTION qsq ON (qsq.QUESTION_SET_ID = v_qset_id AND qsq.QUESTION_ID = q.QUESTION_ID)
        WHERE ea2.STUDENT_ID = p_student_id AND ea2.EXAM_ID = p_exam_id
    ) src
    ON (ea.STUDENT_ID = src.STUDENT_ID AND ea.EXAM_ID = src.EXAM_ID AND ea.QUESTION_ID = src.QUESTION_ID)
    WHEN MATCHED THEN UPDATE SET ea.IS_CORRECT = src.COMPUTED_IS_CORRECT, ea.OBTAINED_MARKS = src.COMPUTED_MARKS;

    SELECT NVL(SUM(OBTAINED_MARKS), 0) INTO p_total_score FROM EXAM_ANSWER WHERE STUDENT_ID = p_student_id AND EXAM_ID = p_exam_id;

    MERGE INTO EXAM_PARTICIPATION ep
    USING DUAL ON (ep.STUDENT_ID = p_student_id AND ep.EXAM_ID = p_exam_id)
    WHEN MATCHED THEN UPDATE SET ep.OBTAINED_MARKS = p_total_score, ep.FEEDBACK = 'Evaluated via Oracle Stored Procedure'
    WHEN NOT MATCHED THEN INSERT (STUDENT_ID, EXAM_ID, OBTAINED_MARKS, FEEDBACK) VALUES (p_student_id, p_exam_id, p_total_score, 'Evaluated via Oracle Stored Procedure');
    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN p_total_score := 0;
    WHEN OTHERS THEN ROLLBACK; RAISE;
END EVALUATE_EXAM_SUBMISSION;
`);
            await connection.execute(`
CREATE OR REPLACE TRIGGER TRG_QUESTION_AUDIT
AFTER INSERT OR UPDATE OR DELETE ON QUESTION
FOR EACH ROW
BEGIN
    IF INSERTING THEN
        INSERT INTO QUESTION_LOG (TEACHER_ID, QUESTION_ID, ACTION, ACTION_TIME) VALUES (:NEW.TEACHER_ID, :NEW.QUESTION_ID, 'INSERT', SYSDATE);
    ELSIF UPDATING THEN
        INSERT INTO QUESTION_LOG (TEACHER_ID, QUESTION_ID, ACTION, ACTION_TIME) VALUES (NVL(:NEW.TEACHER_ID, :OLD.TEACHER_ID), :NEW.QUESTION_ID, 'UPDATE', SYSDATE);
    ELSIF DELETING THEN
        INSERT INTO QUESTION_LOG (TEACHER_ID, QUESTION_ID, ACTION, ACTION_TIME) VALUES (:OLD.TEACHER_ID, :OLD.QUESTION_ID, 'DELETE', SYSDATE);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END TRG_QUESTION_AUDIT;
`);
            console.log('PL/SQL stored procedure and triggers configured.');
        } catch (plsqlErr) {
            console.log('PL/SQL setup note:', plsqlErr.message);
        }

        console.log('Database initialization and seeding completed successfully!');
    } catch (err) {
        console.error('Database setup failed:', err);
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;
