-- Create a type for the exam object
-- Drop the exam_table type
DROP TYPE exam_table FORCE;

-- Drop the exam_obj type
DROP TYPE exam_obj FORCE;

DROP FUNCTION get_scheduled_exams;

CREATE OR REPLACE TYPE exam_obj AS OBJECT (
  exam_id NUMBER,
  exam_type VARCHAR2(100),
  scheduled_by VARCHAR2(100),
  teacher_name VARCHAR2(100),
  exam_time TIMESTAMP,
  exam_duration NUMBER
);
/

-- Create a type for the table of exam objects
CREATE OR REPLACE TYPE exam_table AS TABLE OF exam_obj;
/

-- Create the function to get scheduled exams
CREATE OR REPLACE FUNCTION get_scheduled_exams(
    exam_start_time TIMESTAMP,
    exam_duration NUMBER
)
RETURN exam_table PIPELINED
IS
    exam_row EXAM%ROWTYPE;
    teacher_name VARCHAR2(100); -- Declare the variable for teacher name
    exam_end_time TIMESTAMP;
BEGIN
    -- Calculate exam end time
    exam_end_time := exam_start_time + INTERVAL '1' MINUTE * exam_duration;

    -- Fetch exams scheduled during the specified time period
    FOR exam_row IN (
        SELECT e.*, t.FIRST_NAME || ' ' || t.LAST_NAME AS teacher_name
        FROM EXAM e
        JOIN TEACHER t ON e.SCHEDULED_BY = t.TEACHER_ID 
        WHERE ((e.EXAM_TIME BETWEEN exam_start_time AND exam_end_time)
        OR ((e.EXAM_TIME + e.EXAM_DURATION / (24 * 60)) BETWEEN exam_start_time AND exam_end_time))
				AND e.EXAM_TYPE = 'Scheduled'
    ) LOOP
        -- Pipe each exam as a row of the pipelined table
        PIPE ROW(exam_obj(
            exam_row.EXAM_ID,
            exam_row.EXAM_TYPE,
            exam_row.SCHEDULED_BY,
            exam_row.TEACHER_NAME, -- Use the alias for the teacher name
            exam_row.EXAM_TIME,
            exam_row.EXAM_DURATION
        ));
    END LOOP;

    RETURN;
END;
/

-- Call the function to get scheduled exams
SELECT * FROM TABLE(get_scheduled_exams(TO_TIMESTAMP('2024-03-06 09:20:00', 'YYYY-MM-DD HH24:MI:SS'), 32000));
