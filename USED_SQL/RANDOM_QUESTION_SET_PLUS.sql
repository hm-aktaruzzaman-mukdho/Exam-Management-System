CREATE OR REPLACE PROCEDURE CREATE_QUESTION_SET_RANDOM (
    p_question_set_name IN VARCHAR2,
    p_accessibility_level IN VARCHAR2,
    p_teacher_id IN NUMBER,
    p_number_of_questions IN NUMBER,
    p_mark_of_question IN NUMBER,
		p_level_name IN VARCHAR2,
    p_topic_names IN VARCHAR2 -- Comma-separated list of topic names
		
) AS
    v_question_set_id NUMBER;
BEGIN
    -- Generate the next sequence value for Question_Set_ID
    SELECT MAX(QUESTION_SET_ID) + 1 INTO v_question_set_id FROM QUESTION_SET;

    -- Insert into Question_Set table
    INSERT INTO Question_Set (Question_Set_Name, Accessibility_Level, TEACHER_ID, NO_OF_QUESTIONS, TOTAL_MARKS,LEVEL_NAME)
    VALUES (p_question_set_name, p_accessibility_level, p_teacher_id, p_number_of_questions, p_mark_of_question * p_number_of_questions,p_level_name);

    FOR rec IN (
            SELECT *
            FROM QUESTION
            WHERE TOPIC_NAME IN (SELECT TRIM(REGEXP_SUBSTR(p_topic_names, '[^,]+', 1, LEVEL)) AS topic_name
																FROM DUAL
																CONNECT BY LEVEL <= REGEXP_COUNT(p_topic_names, ',') + 1)
            AND LEVEL_NAME = p_level_name
            AND ROWNUM <= p_number_of_questions
            ORDER BY DBMS_RANDOM.VALUE
        ) LOOP
            -- Insert into Question_Set_Question table
            INSERT INTO QUESTION_SET_QUESTION (Question_Set_ID, Question_ID, MARK_OF_QUESTION)
            VALUES (v_question_set_id, rec.Question_ID, p_mark_of_question);
        END LOOP;

    -- Print a message indicating the question set has been created
    DBMS_OUTPUT.PUT_LINE('Question Set "' || p_question_set_name || '" created with ID: ' || v_question_set_id);
EXCEPTION
    WHEN OTHERS THEN
        -- Print an error message if an exception occurs
        DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);
END;
/


BEGIN
    CREATE_QUESTION_SET_RANDOM('Sample Question Set 12', '1', 1, 20, 10,'Undergraduate', 'Music History,Probability Theory');
END;
/
