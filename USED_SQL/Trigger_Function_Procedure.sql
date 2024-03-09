CREATE OR REPLACE TRIGGER trg_procedure_function_log
AFTER LOGON ON DATABASE
DECLARE
    v_procedure_function_name VARCHAR2(100);
    v_caller_user VARCHAR2(100);
    v_parameters VARCHAR2(4000);
BEGIN
    -- Retrieve the name of the procedure or function being executed
    v_procedure_function_name := SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') || '.' || SYS_CONTEXT('USERENV', 'CURRENT_PROCEDURE');

    -- Retrieve the username of the caller
    v_caller_user := SYS_CONTEXT('USERENV', 'SESSION_USER');

    -- Retrieve the parameters passed to the procedure or function
    -- For functions, use SYS_CONTEXT('USERENV', 'CURRENT_SQL')
    v_parameters := SYS_CONTEXT('USERENV', 'CURRENT_SQL');

    -- Log the procedure or function call
    INSERT INTO PROCEDURE_FUNCTION_LOG (PROCEDURE_FUNCTION_NAME, CALLER_USER, PARAMETERS)
    VALUES (v_procedure_function_name, v_caller_user, v_parameters);
EXCEPTION
    WHEN OTHERS THEN
        -- Handle exceptions if necessary
        NULL;
END trg_procedure_function_log;
/



CREATE OR REPLACE PROCEDURE demo_procedure(p_param1 NUMBER, p_param2 VARCHAR2)
IS
BEGIN
    DBMS_OUTPUT.PUT_LINE('Demo procedure is called with parameters: p_param1=' || p_param1 || ', p_param2=' || p_param2);
END demo_procedure;
/

DECLARE
BEGIN
demo_procedure(123, 'test');
END;




SELECT * FROM PROCEDURE_FUNCTION_LOG;
