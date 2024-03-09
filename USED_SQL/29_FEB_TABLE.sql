-- Topic Table
CREATE TABLE SUBJECT (
    SUBJECT_NAME VARCHAR2(50) PRIMARY KEY,
    SUBJECT_DESCRIPTION VARCHAR2(4000)
);

CREATE TABLE TOPIC (
    --TOPIC_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    TOPIC_NAME VARCHAR2(50) PRIMARY KEY,
    SUBJECT_NAME VARCHAR2(50),
    TOPIC_DESCRIPTION VARCHAR2(4000),
    FOREIGN KEY (SUBJECT_NAME) REFERENCES SUBJECT(SUBJECT_NAME) ON DELETE CASCADE
);

CREATE TABLE ACADEMIC_LEVEL(
    LEVEL_NAME VARCHAR2(50) PRIMARY KEY,
    LEVEL_DESCRIPTION VARCHAR2(1000)
);

-- Teacher Table
CREATE TABLE TEACHER (
    TEACHER_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    IS_ADMIN NUMBER DEFAULT 0 CHECK(IS_ADMIN=0 OR IS_ADMIN =1),
    --USE TRIGGER TO MAINTAIN THAT THERE IS ONLY ONE ADMIN AT A TIME.(OPTIONAL,MULTIPLE ADMIN LIKE MESSENGER GROUP)
    --THE FIRST TEACHER TO SIGNUP WILL AUTOMATICALLY BE ADMIN AND UPDATED
    --FOR MULTIPLE ADMIN ONLY PREVIOUS ADMIN CAN UPDATE THE NEW ADMIN LIST
    PASSWORD VARCHAR2(255) NOT NULL,
    FIRST_NAME VARCHAR2(50) NOT NULL,
    LAST_NAME VARCHAR2(50),
    EMAIL VARCHAR2(100) UNIQUE NOT NULL,
    APPROVAL_STATUS NUMBER DEFAULT 0 CHECK(APPROVAL_STATUS=0 OR APPROVAL_STATUS =1),
    APPROVED_BY NUMBER,
    REGISTERED_DATE DATE DEFAULT SYSDATE, --NEVER MODIFY THIS REGISTERED DATE.USE TRIGGER TO MAINTAIN THIS
    --WHEN INSERTING AND UPDATING THE :NEW.REGISTERED_DATE = SYSDATE ALWAYS
    --uSE TRIGGER TO MAINTAIN THAT A TEACHER IS NOT APPROVED BT HIMSELF/HERSELF
    FOREIGN KEY (APPROVED_BY) REFERENCES TEACHER(TEACHER_ID)
);


-- Student Table
CREATE TABLE STUDENT (
    STUDENT_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    PASSWORD VARCHAR2(255)NOT NULL,
    FIRST_NAME VARCHAR2(50) NOT NULL,
    LAST_NAME VARCHAR2(50),
    EMAIL VARCHAR2(100) UNIQUE NOT NULL,
    AGE NUMBER CHECK(AGE>5 AND AGE<120),
    LEVEL_NAME VARCHAR2(50) NOT NULL, --NEVER MODIFY THIS REGISTERED DATE USE TRIGGER TO MAINTAIN THIS
    REGISTERED_DATE DATE DEFAULT SYSDATE
    --WHEN INSERTING AND UPDATING THE :NEW.REGISTERED_DATE = SYSDATE ALWAYS
);

CREATE TABLE QUESTION_TYPE(
    TYPE_NAME VARCHAR2(50) PRIMARY KEY,
    TYPE_DESCRIPTION VARCHAR2(1000)
);

-- Question Table
CREATE TABLE QUESTION (
    QUESTION_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    TYPE_NAME VARCHAR2(50),
    QUESTION_BODY VARCHAR2(4000),
    OPTION_1 VARCHAR2(255),
    OPTION_2 VARCHAR2(255),
    OPTION_3 VARCHAR2(255),
    OPTION_4 VARCHAR2(255),
    CORRECT_ANSWER VARCHAR2(255),
    LEVEL_NAME VARCHAR2(50),
    ACCESSIBILITY_LEVEL VARCHAR2(50),
    TEACHER_ID NUMBER,
    TOPIC_NAME VARCHAR2(50),
    FOREIGN KEY (TEACHER_ID) REFERENCES TEACHER(TEACHER_ID) ON DELETE SET NULL,
    FOREIGN KEY (TOPIC_NAME) REFERENCES TOPIC(TOPIC_NAME) ON DELETE SET NULL,
    FOREIGN KEY (TYPE_NAME) REFERENCES QUESTION_TYPE(TYPE_NAME) ON DELETE CASCADE
);


CREATE TABLE STUDENT_QUESTION_PRACTICE(
    STUDENT_ID NUMBER,
    QUESTION_ID NUMBER,
    ATTEMPTED_NUMBER NUMBER DEFAULT 0,
    --CORRECT_NUMBER VARCHAR2(4000), -- Stores how many times he answered correctly 
    GIVEN_ANSWER VARCHAR2(4000), -- Stores the answer given by the student
    PRIMARY KEY (STUDENT_ID, QUESTION_ID),
    IS_CORRECT NUMBER DEFAULT 0, -- Stores whether the answer is correct or not
    FOREIGN KEY (STUDENT_ID) REFERENCES STUDENT(STUDENT_ID) ON DELETE CASCADE,
    FOREIGN KEY (QUESTION_ID) REFERENCES QUESTION(QUESTION_ID) ON DELETE CASCADE

);


-- Question Set Table
CREATE TABLE QUESTION_SET (
    QUESTION_SET_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    QUESTION_SET_NAME VARCHAR2(100),
    ACCESSIBILITY_LEVEL VARCHAR2(50),
 --Creation_Method VARCHAR2(50),
    TEACHER_ID NUMBER,
    NO_OF_QUESTIONS NUMBER, -- New: Added attribute for the number of questions in the set
    TOTAL_MARKS NUMBER CHECK(TOTAL_MARKS > 0),
    LEVEL_NAME VARCHAR2(50),
    FOREIGN KEY (TEACHER_ID) REFERENCES TEACHER(TEACHER_ID) ON DELETE SET NULL
);

-- Question Set Question Table
CREATE TABLE QUESTION_SET_QUESTION (
    QUESTION_SET_ID NUMBER,
    QUESTION_ID NUMBER,
    MARK_OF_QUESTION NUMBER CHECK(MARK_OF_QUESTION > 0),
    PRIMARY KEY (QUESTION_SET_ID, QUESTION_ID),
    FOREIGN KEY (QUESTION_SET_ID) REFERENCES QUESTION_SET(QUESTION_SET_ID) ON DELETE CASCADE,
    FOREIGN KEY (QUESTION_ID) REFERENCES QUESTION(QUESTION_ID) ON DELETE CASCADE
);

-- Exam Table
CREATE TABLE EXAM (
    EXAM_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    EXAM_TYPE VARCHAR2(50) CHECK (EXAM_TYPE IN ('Scheduled', 'Practice')),
    SCHEDULED_BY NUMBER,
    QUESTION_SET_ID NUMBER,
    EXAM_DATE DATE,
    LEVEL_NAME VARCHAR2(50),
    FOREIGN KEY (SCHEDULED_BY) REFERENCES TEACHER(TEACHER_ID) ON DELETE SET NULL,
    FOREIGN KEY (QUESTION_SET_ID) REFERENCES QUESTION_SET(QUESTION_SET_ID) ON DELETE SET NULL
);

-- Exam Participation Table
CREATE TABLE EXAM_PARTICIPATION (
    STUDENT_ID NUMBER,
    EXAM_ID NUMBER,
    OBTAINED_MARKS NUMBER,
    FEEDBACK VARCHAR2(4000),
    PRIMARY KEY (STUDENT_ID, EXAM_ID),
    FOREIGN KEY (STUDENT_ID) REFERENCES STUDENT(STUDENT_ID),
    FOREIGN KEY (EXAM_ID) REFERENCES EXAM(EXAM_ID)
);

-- USE PROCEDURE TO UPDATE THE OBTAINED MARK OF A STUDENT INTO THE EXAM_PARTICIPATION TABLE
--USING THE EXAM_ANSWER TABLE
--procedure_count++;
CREATE TABLE EXAM_ANSWER(
    STUDENT_ID NUMBER,
    QUESTION_ID NUMBER,
    EXAM_ID NUMBER,
    GIVEN_ANSWER VARCHAR2(4000),
    IS_CORRECT NUMBER DEFAULT 0,
    --use trigger to fill the is IS_CORRECT AND OBTAINED_MARKS COLOUMN

    /*
    */
    Obtained_Marks NUMBER DEFAULT 0,
    PRIMARY KEY (STUDENT_ID, QUESTION_ID, EXAM_ID),
    FOREIGN KEY (STUDENT_ID) REFERENCES STUDENT(STUDENT_ID) ON DELETE CASCADE,
    FOREIGN KEY (QUESTION_ID) REFERENCES QUESTION(QUESTION_ID) ON DELETE CASCADE,
    FOREIGN KEY (EXAM_ID) REFERENCES EXAM(EXAM_ID) ON DELETE CASCADE
);

-- Assignment Table
CREATE TABLE ASSIGNMENT (
    ASSIGNMENT_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ASSIGNMENT_NAME VARCHAR2(50),
    TOPIC_NAME VARCHAR2(50),
    LEVEL_NAME VARCHAR2(50),
    ASSIGNMENT_DETAILS VARCHAR2(4000),
    SUBMISSION_DEADLINE DATE DEFAULT (SYSDATE+7), -- New: Added submission deadline
    TOTAL_MARKS NUMBER,
    TEACHER_ID NUMBER,
    FOREIGN KEY (TOPIC_NAME) REFERENCES TOPIC(TOPIC_NAME),
    FOREIGN KEY (TEACHER_ID) REFERENCES TEACHER(TEACHER_ID)
);

-- Assignment Submission Table
CREATE TABLE ASSIGNMENT_SUBMISSION (
    STUDENT_ID NUMBER,
    ASSIGNMENT_ID NUMBER,
    SUBMISSION_DETAILS VARCHAR2(4000),
    FEEDBACK VARCHAR2(4000),
    MARKS_OBTAINED NUMBER,
    SUBMITTED_FILE BLOB,
    --may have to change this later to use file path in the databse instead of storing actudal file
    SUBMISSION_TIME TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- New: Added submission time with default value
    SUBMISSION_ATTEMPT NUMBER DEFAULT 0, -- New: Added submission attempt
    --IMCREASE BY TRIGGER WHENEVER A STUDENT SUBMITS AN ASSIGNMENT
    PRIMARY KEY (STUDENT_ID, ASSIGNMENT_ID),
    FOREIGN KEY (STUDENT_ID) REFERENCES STUDENT(STUDENT_ID),
    FOREIGN KEY (ASSIGNMENT_ID) REFERENCES ASSIGNMENT(ASSIGNMENT_ID)
);

--WRITE A LOG TABLE TO STORE STUDENT LOGIN AND LOGOUT TIME AND STUDENT IDENTITY
CREATE TABLE STUDENT_LOG(
    STUDENT_ID NUMBER,
    LOGIN_TIME TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LOGOUT_TIME TIMESTAMP,
    PRIMARY KEY (STUDENT_ID, LOGIN_TIME),
    FOREIGN KEY (STUDENT_ID) REFERENCES STUDENT(STUDENT_ID)
);

--WRITE A LOG TABLE TO STORE TEACHER LOGIN AND LOGOUT TIME AND TEACHER IDENTITY
CREATE TABLE TEACHER_LOG(
    TEACHER_ID NUMBER,
    LOGIN_TIME TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LOGOUT_TIME TIMESTAMP,
    PRIMARY KEY (TEACHER_ID, LOGIN_TIME),
    FOREIGN KEY (TEACHER_ID) REFERENCES TEACHER(TEACHER_ID)
);

--WRITE A LOG TABLE TO STORE THE TEACHER ID QUESTION ID ANDACTION(INSERT,UPDATE,DELETE) AND TIME OF THE ACTION
CREATE TABLE QUESTION_LOG(
    TEACHER_ID NUMBER,
    QUESTION_ID NUMBER,
    ACTION VARCHAR2(50) CHECK(ACTION IN ('INSERT', 'UPDATE', 'DELETE')),
    ACTION_TIME TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (TEACHER_ID, QUESTION_ID, ACTION_TIME),
    FOREIGN KEY (TEACHER_ID) REFERENCES TEACHER(TEACHER_ID),
    FOREIGN KEY (QUESTION_ID) REFERENCES QUESTION(QUESTION_ID)
);

--WRITE A LOG TABLE TO STORE THE TEACHER ID QUESTION SET ID AND ACTION(INSERT,UPDATE,DELETE) AND TIME OF THE ACTION
CREATE TABLE QUESTION_SET_LOG(
    TEACHER_ID NUMBER,
    QUESTION_SET_ID NUMBER,
    ACTION VARCHAR2(50) CHECK(ACTION IN ('INSERT', 'UPDATE', 'DELETE')),
    ACTION_TIME TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (TEACHER_ID, QUESTION_SET_ID, ACTION_TIME),
    FOREIGN KEY (TEACHER_ID) REFERENCES TEACHER(TEACHER_ID),
    FOREIGN KEY (QUESTION_SET_ID) REFERENCES QUESTION_SET(QUESTION_SET_ID)
);

