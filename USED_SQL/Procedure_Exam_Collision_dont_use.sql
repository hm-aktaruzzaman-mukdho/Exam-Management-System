-- Create a type for the exam object
DROP TYPE exam_table FORCE;

-- Drop the exam_obj type
DROP TYPE exam_obj FORCE;
DROP PROCEDURE get_scheduled_exams;

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

-- Create the procedure to get scheduled exams
CREATE OR REPLACE PROCEDURE get_scheduled_exams(
    exam_start_time IN TIMESTAMP,
    exam_duration IN NUMBER,
    scheduled_exams OUT exam_table
)
IS
    exam_row EXAM%ROWTYPE;
    teacher_name VARCHAR2(100); -- Declare the variable for teacher name
    exam_end_time TIMESTAMP;
BEGIN
    -- Initialize the output parameter
    scheduled_exams := exam_table();

    -- Calculate exam end time
    exam_end_time := exam_start_time + INTERVAL '1' MINUTE * exam_duration;

    -- Fetch exams scheduled during the specified time period
    FOR exam_row IN (
        SELECT e.*, t.FIRST_NAME || ' ' || t.LAST_NAME AS teacher_name
        FROM EXAM e
        JOIN TEACHER t ON e.SCHEDULED_BY = t.TEACHER_ID 
        WHERE (e.EXAM_TIME BETWEEN exam_start_time AND exam_end_time)
        OR ((e.EXAM_TIME + e.EXAM_DURATION / (24 * 60)) BETWEEN exam_start_time AND exam_end_time)
    ) LOOP
        -- Append each exam to the output parameter
        scheduled_exams.extend;
        scheduled_exams(scheduled_exams.count) := exam_obj(
            exam_row.EXAM_ID,
            exam_row.EXAM_TYPE,
            exam_row.SCHEDULED_BY,
            exam_row.TEACHER_NAME, -- Use the alias for the teacher name
            exam_row.EXAM_TIME,
            exam_row.EXAM_DURATION
        );
    END LOOP;
END;
/


DECLARE
    scheduled_exams exam_table;
BEGIN
    get_scheduled_exams(TO_TIMESTAMP('2024-03-08 09:20:00', 'YYYY-MM-DD HH24:MI:SS'), 12000, scheduled_exams);
    
    --Process the scheduled exams as needed
    FOR i IN 1..scheduled_exams.COUNT LOOP
        DBMS_OUTPUT.PUT_LINE('Exam ID: ' || scheduled_exams(i).exam_id);
        DBMS_OUTPUT.PUT_LINE('Exam Type: ' || scheduled_exams(i).exam_type);
        -- Output other exam attributes as needed
    END LOOP;
END;
/
