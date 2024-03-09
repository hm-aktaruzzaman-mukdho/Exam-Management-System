CREATE OR REPLACE FUNCTION check_exam_availability(
    exam_start_time TIMESTAMP,
    exam_duration NUMBER
)
RETURN NUMBER
IS
    exam_count NUMBER;
    exam_end_time TIMESTAMP;
BEGIN
    DBMS_OUTPUT.PUT_LINE('Exam START: ' || exam_start_time);
    DBMS_OUTPUT.PUT_LINE('Exam DUR: ' || exam_duration);

    -- Calculate exam end time
    exam_end_time := exam_start_time + INTERVAL '1' MINUTE * exam_duration;
    DBMS_OUTPUT.PUT_LINE('Exam END DATE: ' || TO_CHAR(exam_end_time, 'YYYY-MM-DD HH24:MI:SS'));

    SELECT COUNT(*)
    INTO exam_count
    FROM EXAM
    WHERE (EXAM_TIME BETWEEN exam_start_time AND exam_end_time)
    OR ((EXAM_TIME + EXAM_DURATION / (24 * 60)) BETWEEN exam_start_time AND exam_end_time);

    IF exam_count > 0 THEN
        DBMS_OUTPUT.PUT_LINE('Exam COUNT: ' || exam_count);
        RETURN 1; -- Exam found within the specified time period
    ELSE
        RETURN 0; -- No exam found within the specified time period
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN -1; -- An error occurred
END;
/


CREATE OR REPLACE FUNCTION check_exam_availability(
    exam_start_time TIMESTAMP,
    exam_duration NUMBER
)
RETURN NUMBER
IS
    exam_count NUMBER := 0;
    exam_exists BOOLEAN := FALSE;
    cursor_exam SYS_REFCURSOR;
    exam_row EXAM%ROWTYPE;
    exam_end_time TIMESTAMP; -- Declare the exam_end_time variable
BEGIN
    DBMS_OUTPUT.PUT_LINE('Exam START: ' || exam_start_time);
    DBMS_OUTPUT.PUT_LINE('Exam DUR: ' || exam_duration);

    -- Calculate exam end time
    exam_end_time := exam_start_time + INTERVAL '1' MINUTE * exam_duration;
    DBMS_OUTPUT.PUT_LINE('Exam END DATE: ' || TO_CHAR(exam_end_time, 'YYYY-MM-DD HH24:MI:SS'));
		DBMS_OUTPUT.PUT_LINE('');
    OPEN cursor_exam FOR
        SELECT *
        FROM EXAM
        WHERE (EXAM_TIME BETWEEN exam_start_time AND exam_end_time)
        OR ((EXAM_TIME + EXAM_DURATION / (24 * 60)) BETWEEN exam_start_time AND exam_end_time);

    LOOP
        FETCH cursor_exam INTO exam_row;
        EXIT WHEN cursor_exam%NOTFOUND;

        DBMS_OUTPUT.PUT_LINE('Exam ID: ' || exam_row.EXAM_ID);
        DBMS_OUTPUT.PUT_LINE('Exam Type: ' || exam_row.EXAM_TYPE);
        DBMS_OUTPUT.PUT_LINE('Scheduled By: ' || exam_row.SCHEDULED_BY);
        DBMS_OUTPUT.PUT_LINE('Exam Time: ' || TO_CHAR(exam_row.EXAM_TIME, 'YYYY-MM-DD HH24:MI:SS'));
        DBMS_OUTPUT.PUT_LINE('Exam Duration: ' || exam_row.EXAM_DURATION || ' minutes');
        DBMS_OUTPUT.PUT_LINE('');
        exam_exists := TRUE;
        exam_count := exam_count + 1;
    END LOOP;

    CLOSE cursor_exam;

    IF exam_exists THEN
        RETURN exam_count;
    ELSE
        RETURN 0;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN -1; -- An error occurred
END;
/



DECLARE
    exam_start_time TIMESTAMP := TO_TIMESTAMP('2024-03-01 09:20:00', 'YYYY-MM-DD HH24:MI:SS');
    exam_duration NUMBER := 120000; -- Exam duration in minutes
    exam_available NUMBER;
BEGIN
    exam_available := check_exam_availability(exam_start_time, exam_duration);
    IF exam_available > 0 THEN
        DBMS_OUTPUT.PUT_LINE('An exam is scheduled during the specified time period.');
    ELSIF exam_available = 0 THEN
        DBMS_OUTPUT.PUT_LINE('No exam is scheduled during the specified time period.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('An error occurred while checking exam availability.');
    END IF;
END;
/
