--- TONMOY (MODIFY 3) --->WORKING VERSION
drop trigger update_obtained_marks;

CREATE OR REPLACE TRIGGER update_obtained_marks
BEFORE INSERT OR UPDATE ON EXAM_PARTICIPATION
FOR EACH ROW
BEGIN
    -- Calculate the obtained marks for the given student and exam
    BEGIN
        SELECT NVL(SUM(ea.OBTAINED_MARKS), 0)
        INTO :NEW.OBTAINED_MARKS
        FROM EXAM_ANSWER ea
        WHERE ea.STUDENT_ID = :NEW.STUDENT_ID
        AND ea.EXAM_ID = :NEW.EXAM_ID
        AND ea.IS_CORRECT = 1;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            :NEW.OBTAINED_MARKS := 0;
    END;
END;
/

















CREATE OR REPLACE TRIGGER update_obtained_marks
AFTER INSERT OR UPDATE ON EXAM_ANSWER
FOR EACH ROW
BEGIN
    -- Calculate the obtained marks for the given student and exam
    UPDATE EXAM_PARTICIPATION ep
    SET ep.OBTAINED_MARKS = (
        SELECT SUM(qsq.MARK_OF_QUESTION)
        FROM EXAM_ANSWER ea
        JOIN QUESTION_SET_QUESTION qsq ON ea.QUESTION_ID = qsq.QUESTION_ID
        WHERE ea.STUDENT_ID = :NEW.STUDENT_ID
        AND ea.EXAM_ID = :NEW.EXAM_ID
        AND ea.IS_CORRECT = 1
    )
    WHERE ep.STUDENT_ID = :NEW.STUDENT_ID
    AND ep.EXAM_ID = :NEW.EXAM_ID;
END;
/

drop trigger update_obtained_marks;

CREATE OR REPLACE TRIGGER update_obtained_marks
AFTER INSERT OR UPDATE ON EXAM_PARTICIPATION
FOR EACH ROW
BEGIN
    -- Calculate the obtained marks for the given student and exam
    UPDATE EXAM_PARTICIPATION ep
    SET ep.OBTAINED_MARKS = (
        SELECT SUM(qsq.MARK_OF_QUESTION)
        FROM EXAM_ANSWER ea
        JOIN QUESTION_SET_QUESTION qsq ON ea.QUESTION_ID = qsq.QUESTION_ID
        WHERE ea.STUDENT_ID = :NEW.STUDENT_ID
        AND ea.EXAM_ID = :NEW.EXAM_ID
        AND ea.IS_CORRECT = 1
    )
    WHERE ep.STUDENT_ID = :NEW.STUDENT_ID
    AND ep.EXAM_ID = :NEW.EXAM_ID;
END;
/

--- TONMOY (MODIFY)
drop trigger update_obtained_marks;

CREATE OR REPLACE TRIGGER update_obtained_marks
BEFORE INSERT OR UPDATE ON EXAM_PARTICIPATION
FOR EACH ROW
BEGIN
    -- Calculate the obtained marks for the given student and exam
    UPDATE EXAM_PARTICIPATION ep
    SET ep.OBTAINED_MARKS = (
        SELECT SUM(ea.OBTAINED_MARKS)
        FROM EXAM_ANSWER ea
        WHERE ea.STUDENT_ID = :NEW.STUDENT_ID
        AND ea.EXAM_ID = :NEW.EXAM_ID
        AND ea.IS_CORRECT = 1
    )
    WHERE ep.STUDENT_ID = :NEW.STUDENT_ID
    AND ep.EXAM_ID = :NEW.EXAM_ID;
EXCEPTION
	WHEN OTHERS THEN
	DBMS_OUTPUT.PUT_LINE('ERROR OTHERS');
END;
/


--- TONMOY (MODIFY 2)
drop trigger update_obtained_marks;

CREATE OR REPLACE TRIGGER update_obtained_marks
BEFORE INSERT OR UPDATE ON EXAM_PARTICIPATION
FOR EACH ROW
BEGIN
    -- Calculate the obtained marks for the given student and exam
		
		SELECT SUM(ea.OBTAINED_MARKS)  
		INTO :NEW.OBTAINED_MARKS
		FROM EXAM_ANSWER ea
    WHERE ea.STUDENT_ID = :NEW.STUDENT_ID
    AND ea.EXAM_ID = :NEW.EXAM_ID
    AND ea.IS_CORRECT = 1

	
EXCEPTION
	WHEN OTHERS THEN
	DBMS_OUTPUT.PUT_LINE('ERROR OTHERS');
END;
/


