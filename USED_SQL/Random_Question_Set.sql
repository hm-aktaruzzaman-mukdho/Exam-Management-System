CREATE OR REPLACE PROCEDURE create_question_set_with_topics(
    p_question_set_name IN VARCHAR2,
    p_accessibility_level IN VARCHAR2,
    p_number_of_questions IN NUMBER,
    p_mark_of_question IN NUMBER,
    p_academic_level_name IN VARCHAR2,
    p_topics SYS.ODCIVARCHAR2LIST
) IS
    v_question_set_id NUMBER;
BEGIN
    -- Generate the next sequence value for Question_Set_ID
    SELECT question_set_sequence.NEXTVAL INTO v_question_set_id FROM DUAL;

    -- Insert into Question_Set table
    INSERT INTO Question_Set (Question_Set_ID, Question_Set_Name, Accessibility_level)
    VALUES (v_question_set_id, p_question_set_name, p_accessibility_level);

    -- Select random questions based on topics and academic level
    FOR rec IN (
        SELECT q.QUESTION_ID
        FROM QUESTION q
        JOIN TOPIC t ON q.TOPIC_NAME = t.TOPIC_NAME
        WHERE t.SUBJECT_NAME IN (SELECT COLUMN_VALUE FROM TABLE(p_topics))
        AND q.LEVEL_NAME = p_academic_level_name
        ORDER BY DBMS_RANDOM.VALUE
    ) LOOP
        -- Insert into Question_Set_Question table
        INSERT INTO Question_Set_Question (Question_Set_ID, Question_ID, Mark_Of_Question)
        VALUES (v_question_set_id, rec.QUESTION_ID, p_mark_of_question);
        
        p_number_of_questions := p_number_of_questions - 1; -- decrement the count of remaining questions
        
        EXIT WHEN p_number_of_questions <= 0; -- exit loop when required number of questions added
    END LOOP;

    -- If required number of questions not found, delete the incomplete question set
    IF p_number_of_questions > 0 THEN
        DELETE FROM Question_Set WHERE Question_Set_ID = v_question_set_id;
        DBMS_OUTPUT.PUT_LINE('Insufficient questions available for the specified topics and academic level.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('Question Set created with ID: ' || v_question_set_id);
    END IF;
END;
/



DECLARE
    -- Define variables to hold parameter values
    v_question_set_name VARCHAR2(100) := 'Sample Question Set';
    v_accessibility_level VARCHAR2(50) := 'Public';
    v_number_of_questions NUMBER := 10;
    v_mark_of_question NUMBER := 10;
    v_academic_level_name VARCHAR2(50) := 'Undergraduate';
    v_topics SYS.ODCIVARCHAR2LIST := SYS.ODCIVARCHAR2LIST('Probability Theory', 'Art History', 'Quantum Mechanics');
BEGIN
    -- Call the procedure with the provided parameters
    create_question_set_with_topics(
        p_question_set_name => v_question_set_name,
        p_accessibility_level => v_accessibility_level,
        p_number_of_questions => v_number_of_questions,
        p_mark_of_question => v_mark_of_question,
        p_academic_level_name => v_academic_level_name,
        p_topics => v_topics
    );
END;
/


SELECT * FROM USER_ERRORS WHERE NAME = 'CREATE_QUESTION_SET_WITH_TOPICS';


SELECT * FROM QUESTION_SET;

SELECT * FROM QUESTION_SET_QUESTION;