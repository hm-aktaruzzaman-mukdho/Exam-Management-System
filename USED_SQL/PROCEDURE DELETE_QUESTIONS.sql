DROP PROCEDURE DELETE_QUESTIONS;

CREATE OR REPLACE PROCEDURE DELETE_QUESTIONS (QID_ARRAY IN SYS.ODCINUMBERLIST) AS
  IS_DELETED NUMBER;
BEGIN
  FOR i IN 1..QID_ARRAY.COUNT LOOP
    -- Check if the question exists
    BEGIN
      SELECT COUNT(*) INTO IS_DELETED FROM QUESTION WHERE QUESTION_ID = QID_ARRAY(i);

      -- If the question exists, update its IS_DELETED value to 1
      IF IS_DELETED > 0 THEN
        UPDATE QUESTION SET IS_DELETED = 1 WHERE QUESTION_ID = QID_ARRAY(i);
        DBMS_OUTPUT.PUT_LINE('Question with ID ' || QID_ARRAY(i) || ' has been deleted.');
      ELSE
        DBMS_OUTPUT.PUT_LINE('Question with ID ' || QID_ARRAY(i) || ' does not exist.');
      END IF;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        DBMS_OUTPUT.PUT_LINE('Question with ID ' || QID_ARRAY(i) || ' does not exist.');
    END;
  END LOOP;
END;
/

DECLARE
  QID_ARRAY SYS.ODCINUMBERLIST := SYS.ODCINUMBERLIST(224,225, 226, 227); -- Array of question IDs to delete
BEGIN
  DELETE_QUESTIONS(QID_ARRAY);
END;
/