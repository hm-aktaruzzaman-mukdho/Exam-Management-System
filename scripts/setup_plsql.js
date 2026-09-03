const db = require('../db');

async function compilePLSQL() {
    console.log('Compiling PL/SQL stored procedures and triggers...');
    const conn = await db.getConnection();

    try {
        // 1. EVALUATE_EXAM_SUBMISSION Stored Procedure
        const procedureSql = `
CREATE OR REPLACE PROCEDURE EVALUATE_EXAM_SUBMISSION(
    p_student_id IN NUMBER,
    p_exam_id    IN NUMBER,
    p_total_score OUT NUMBER
) AS
    v_qset_id NUMBER;
BEGIN
    -- 1. Obtain Question Set ID for the exam
    SELECT QUESTION_SET_ID INTO v_qset_id
    FROM EXAM
    WHERE EXAM_ID = p_exam_id;

    -- 2. Update each question's correctness and marks in EXAM_ANSWER
    MERGE INTO EXAM_ANSWER ea
    USING (
        SELECT 
            ea2.STUDENT_ID,
            ea2.EXAM_ID,
            ea2.QUESTION_ID,
            CASE 
                WHEN LOWER(TRIM(ea2.GIVEN_ANSWER)) = LOWER(TRIM(q.CORRECT_ANSWER)) THEN 1 
                ELSE 0 
            END AS COMPUTED_IS_CORRECT,
            CASE 
                WHEN LOWER(TRIM(ea2.GIVEN_ANSWER)) = LOWER(TRIM(q.CORRECT_ANSWER)) THEN NVL(qsq.MARK_OF_QUESTION, 1) 
                ELSE 0 
            END AS COMPUTED_MARKS
        FROM EXAM_ANSWER ea2
        JOIN QUESTION q ON ea2.QUESTION_ID = q.QUESTION_ID
        LEFT JOIN QUESTION_SET_QUESTION qsq ON (qsq.QUESTION_SET_ID = v_qset_id AND qsq.QUESTION_ID = q.QUESTION_ID)
        WHERE ea2.STUDENT_ID = p_student_id AND ea2.EXAM_ID = p_exam_id
    ) src
    ON (ea.STUDENT_ID = src.STUDENT_ID AND ea.EXAM_ID = src.EXAM_ID AND ea.QUESTION_ID = src.QUESTION_ID)
    WHEN MATCHED THEN
        UPDATE SET 
            ea.IS_CORRECT = src.COMPUTED_IS_CORRECT,
            ea.OBTAINED_MARKS = src.COMPUTED_MARKS;

    -- 3. Calculate total obtained marks
    SELECT NVL(SUM(OBTAINED_MARKS), 0) INTO p_total_score
    FROM EXAM_ANSWER
    WHERE STUDENT_ID = p_student_id AND EXAM_ID = p_exam_id;

    -- 4. Upsert total score into EXAM_PARTICIPATION
    MERGE INTO EXAM_PARTICIPATION ep
    USING DUAL ON (ep.STUDENT_ID = p_student_id AND ep.EXAM_ID = p_exam_id)
    WHEN MATCHED THEN 
        UPDATE SET ep.OBTAINED_MARKS = p_total_score, ep.FEEDBACK = 'Evaluated via Oracle Stored Procedure'
    WHEN NOT MATCHED THEN 
        INSERT (STUDENT_ID, EXAM_ID, OBTAINED_MARKS, FEEDBACK)
        VALUES (p_student_id, p_exam_id, p_total_score, 'Evaluated via Oracle Stored Procedure');

    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        p_total_score := 0;
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END EVALUATE_EXAM_SUBMISSION;
`;
        await conn.execute(procedureSql);
        console.log('✔ Procedure EVALUATE_EXAM_SUBMISSION compiled successfully.');

        // 2. TRG_QUESTION_AUDIT Trigger
        const triggerSql = `
CREATE OR REPLACE TRIGGER TRG_QUESTION_AUDIT
AFTER INSERT OR UPDATE OR DELETE ON QUESTION
FOR EACH ROW
BEGIN
    IF INSERTING THEN
        INSERT INTO QUESTION_LOG (TEACHER_ID, QUESTION_ID, ACTION, ACTION_TIME)
        VALUES (:NEW.TEACHER_ID, :NEW.QUESTION_ID, 'INSERT', SYSDATE);
    ELSIF UPDATING THEN
        INSERT INTO QUESTION_LOG (TEACHER_ID, QUESTION_ID, ACTION, ACTION_TIME)
        VALUES (NVL(:NEW.TEACHER_ID, :OLD.TEACHER_ID), :NEW.QUESTION_ID, 'UPDATE', SYSDATE);
    ELSIF DELETING THEN
        INSERT INTO QUESTION_LOG (TEACHER_ID, QUESTION_ID, ACTION, ACTION_TIME)
        VALUES (:OLD.TEACHER_ID, :OLD.QUESTION_ID, 'DELETE', SYSDATE);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END TRG_QUESTION_AUDIT;
`;
        await conn.execute(triggerSql);
        console.log('✔ Trigger TRG_QUESTION_AUDIT compiled successfully.');

    } catch (err) {
        console.error('PL/SQL Compilation error:', err);
    } finally {
        if (conn) await conn.close();
        process.exit(0);
    }
}

compilePLSQL();
