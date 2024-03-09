CREATE OR REPLACE FUNCTION Function_GetAvailableExams RETURN SYS_REFCURSOR IS
  v_current_time TIMESTAMP := SYSTIMESTAMP;
  v_cursor SYS_REFCURSOR;
BEGIN
  OPEN v_cursor FOR
    SELECT *
    FROM EXAM
    WHERE EXAM_TYPE = 'Scheduled'
      AND EXAM_TIME <= v_current_time
      AND EXAM_TIME + INTERVAL '1' HOUR * EXAM_DURATION >= v_current_time;
      
  RETURN v_cursor;
END;
/

DECLARE
  v_exam_cursor SYS_REFCURSOR;
  v_exam_rec EXAM%ROWTYPE;
BEGIN
  v_exam_cursor := Function_GetAvailableExams;
  LOOP
    FETCH v_exam_cursor INTO v_exam_rec;
    EXIT WHEN v_exam_cursor%NOTFOUND;
    
    -- Display exam details or process them as needed
    DBMS_OUTPUT.PUT_LINE('Exam ID: ' || v_exam_rec.EXAM_ID);
    DBMS_OUTPUT.PUT_LINE('Exam Type: ' || v_exam_rec.EXAM_TYPE);
    DBMS_OUTPUT.PUT_LINE('Scheduled By: ' || v_exam_rec.SCHEDULED_BY);
    DBMS_OUTPUT.PUT_LINE('Question Set ID: ' || v_exam_rec.QUESTION_SET_ID);
    DBMS_OUTPUT.PUT_LINE('Exam Time: ' || TO_CHAR(v_exam_rec.EXAM_TIME, 'YYYY-MM-DD HH24:MI:SS'));
    DBMS_OUTPUT.PUT_LINE('Exam Duration: ' || v_exam_rec.EXAM_DURATION || ' minutes');
    DBMS_OUTPUT.PUT_LINE('Level Name: ' || v_exam_rec.LEVEL_NAME);
    DBMS_OUTPUT.PUT_LINE('-----------------------------------');
  END LOOP;
  
  CLOSE v_exam_cursor;
END;
/
