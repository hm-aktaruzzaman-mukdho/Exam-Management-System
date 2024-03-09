DROP TRIGGER update_is_correct;

CREATE OR REPLACE TRIGGER update_is_correct
BEFORE INSERT OR UPDATE ON EXAM_ANSWER
FOR EACH ROW
DECLARE
    v_correct_answer VARCHAR2(4000);
BEGIN
    -- Retrieve the correct answer for the question
    
		SELECT q.CORRECT_ANSWER
    INTO v_correct_answer
    FROM QUESTION q
    WHERE q.QUESTION_ID = :NEW.QUESTION_ID;
		
    -- Check if the given answer matches the correct answer for the question
    IF :NEW.GIVEN_ANSWER = v_correct_answer THEN
        -- Set IS_CORRECT to 1 if the answer is correct, otherwise set it to 0
        :NEW.IS_CORRECT := 1;
				-- Calculate obtained marks using a subquery
        SELECT MARK_OF_QUESTION
        INTO :NEW.OBTAINED_MARKS
        FROM QUESTION_SET_QUESTION
        WHERE QUESTION_ID = :NEW.QUESTION_ID
        AND QUESTION_SET_ID = (
            SELECT QUESTION_SET_ID
            FROM EXAM
            WHERE EXAM_ID = :NEW.EXAM_ID
        );

    ELSE
        :NEW.IS_CORRECT := 0;
				:NEW.Obtained_Marks := 0;
    END IF;
EXCEPTION 
		WHEN no_data_found then
		DBMS_OUTPUT.PUT_LINE('NO DATA FOUND ');
		WHEN others THEN
		DBMS_OUTPUT.PUT_LINE('ERROR OTHERS ');
END;
/

