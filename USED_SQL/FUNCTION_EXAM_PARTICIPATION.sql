CREATE OR REPLACE FUNCTION check_exam_participation(
    p_student_id IN NUMBER,
    p_exam_id IN NUMBER
) RETURN NUMBER IS
    v_count NUMBER;
BEGIN
    -- Count the number of rows where the given student ID and exam ID exist in the EXAM_PARTICIPATION table
    SELECT COUNT(*)
    INTO v_count
    FROM EXAM_PARTICIPATION
    WHERE STUDENT_ID = p_student_id
    AND EXAM_ID = p_exam_id;

    -- Return 1 if the student appeared in the exam, otherwise return 0
    IF v_count > 0 THEN
        RETURN 1;
    ELSE
        RETURN 0;
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        -- If no data is found, return 0
        RETURN 0;
END check_exam_participation;
/


DECLARE
    v_result NUMBER;
BEGIN
    v_result := check_exam_participation(2, 1); -- Replace 123 and 456 with actual student ID and exam ID
    DBMS_OUTPUT.PUT_LINE('Result: ' || v_result);
END;
