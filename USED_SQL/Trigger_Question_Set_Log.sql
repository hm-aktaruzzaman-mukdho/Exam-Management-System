CREATE OR REPLACE TRIGGER question_set_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON QUESTION_SET
FOR EACH ROW
BEGIN
    IF INSERTING THEN
        INSERT INTO QUESTION_SET_LOG (TEACHER_ID, QUESTION_SET_ID, ACTION)
        VALUES (:NEW.TEACHER_ID, :NEW.QUESTION_SET_ID, 'INSERT');
    ELSIF UPDATING THEN
        INSERT INTO QUESTION_SET_LOG (TEACHER_ID, QUESTION_SET_ID, ACTION)
        VALUES (:NEW.TEACHER_ID, :OLD.QUESTION_SET_ID, 'UPDATE');
    ELSIF DELETING THEN
        INSERT INTO QUESTION_SET_LOG (TEACHER_ID, QUESTION_SET_ID, ACTION)
        VALUES (:OLD.TEACHER_ID, :OLD.QUESTION_SET_ID, 'DELETE');
    END IF;
END;
/
