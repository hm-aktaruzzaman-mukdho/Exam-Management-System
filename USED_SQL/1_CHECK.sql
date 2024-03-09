-- Create a nested table type to match the structure of the EXAM table
CREATE OR REPLACE TYPE exam_record_type AS OBJECT (
    exam_id NUMBER,
    exam_type VARCHAR2(100),
    scheduled_by VARCHAR2(100),
    exam_time TIMESTAMP,
    exam_duration NUMBER
);

CREATE OR REPLACE TYPE exam_table_type AS TABLE OF exam_record_type;

-- Create a function to check exam availability and return the rows
CREATE OR REPLACE FUNCTION check_exam_availability(
    exam_start_time TIMESTAMP,
    exam_duration NUMBER
)
RETURN exam_table_type
IS
    exam_table exam_table_type := exam_table_type();
    exam_end_time TIMESTAMP;
    cursor_exam SYS_REFCURSOR;
    exam_row EXAM%ROWTYPE;
BEGIN
    -- Calculate exam end time
    exam_end_time := exam_start_time + INTERVAL '1' MINUTE * exam_duration;

    OPEN cursor_exam FOR
        SELECT *
        FROM EXAM
        WHERE (EXAM_TIME BETWEEN exam_start_time AND exam_end_time)
        OR ((EXAM_TIME + EXAM_DURATION / (24 * 60)) BETWEEN exam_start_time AND exam_end_time);

    LOOP
        FETCH cursor_exam INTO exam_row;
        EXIT WHEN cursor_exam%NOTFOUND;

        exam_table.extend;
        exam_table(exam_table.last) := exam_record_type(
            exam_id => exam_row.EXAM_ID,
            exam_type => exam_row.EXAM_TYPE,
            scheduled_by => exam_row.SCHEDULED_BY,
            exam_time => exam_row.EXAM_TIME,
            exam_duration => exam_row.EXAM_DURATION
        );
    END LOOP;

    CLOSE cursor_exam;

    RETURN exam_table;
END;
/

-- PL/SQL block to call the function and insert the retrieved rows into a table
DECLARE
    exam_start_time TIMESTAMP := TO_TIMESTAMP('2024-03-01 09:20:00', 'YYYY-MM-DD HH24:MI:SS');
    exam_duration NUMBER := 120000; -- Exam duration in minutes
    exam_rows exam_table_type;
BEGIN
    -- Call the function to check exam availability
    exam_rows := check_exam_availability(exam_start_time, exam_duration);

--     -- Insert the retrieved rows into a table
--     FOR i IN 1..exam_rows.count LOOP
--         INSERT INTO your_table_name (exam_id, exam_type, scheduled_by, exam_time, exam_duration)
--         VALUES (exam_rows(i).exam_id, exam_rows(i).exam_type, exam_rows(i).scheduled_by, exam_rows(i).exam_time, exam_rows(i).exam_duration);
--     END LOOP;
-- 
--     COMMIT;

			SELECT * from exam_rows;
END;
/
