CREATE OR REPLACE TYPE my_type AS TABLE OF VARCHAR2(100);
/

CREATE OR REPLACE FUNCTION my_function(
    args IN my_type
) RETURN VARCHAR2
IS
    result VARCHAR2(1000);
BEGIN
    -- Process the arguments here
    FOR i IN 1..args.COUNT LOOP
        result := result || args(i) || ', ';
    END LOOP;
    -- Remove the trailing comma and space
    result := RTRIM(result, ', ');
    
    RETURN result;
END;
/

SELECT my_function(my_type('arg1', 'arg2', 'arg3','arg4')) AS result FROM DUAL;
