CREATE OR REPLACE PROCEDURE GetAvailableExams AS
  v_current_time TIMESTAMP := SYSTIMESTAMP;
BEGIN
  FOR exam_rec IN (
    SELECT *
    FROM EXAM
    WHERE EXAM_TYPE = 'Scheduled'
      AND EXAM_TIME <= v_current_time
      AND EXAM_TIME + INTERVAL '1' HOUR * EXAM_DURATION >= v_current_time
  ) LOOP
    DBMS_OUTPUT.PUT_LINE('Exam ID: ' || exam_rec.EXAM_ID);
    DBMS_OUTPUT.PUT_LINE('Exam Type: ' || exam_rec.EXAM_TYPE);
    DBMS_OUTPUT.PUT_LINE('Scheduled By: ' || exam_rec.SCHEDULED_BY);
    DBMS_OUTPUT.PUT_LINE('Question Set ID: ' || exam_rec.QUESTION_SET_ID);
    DBMS_OUTPUT.PUT_LINE('Exam Time: ' || TO_CHAR(exam_rec.EXAM_TIME, 'YYYY-MM-DD HH24:MI:SS'));
    DBMS_OUTPUT.PUT_LINE('Exam Duration: ' || exam_rec.EXAM_DURATION || ' minutes');
    DBMS_OUTPUT.PUT_LINE('Level Name: ' || exam_rec.LEVEL_NAME);
    DBMS_OUTPUT.PUT_LINE('-----------------------------------');
  END LOOP;
END;
/

BEGIN
  GetAvailableExams;
END;
/
