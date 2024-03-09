DROP PROCEDURE print_array_elements;

CREATE OR REPLACE PROCEDURE print_array_elements(arr IN sys.odcinumberlist) IS
    -- Declare a VARCHAR2 variable to store the array elements
    array_elements VARCHAR2(4000);
BEGIN
    -- Loop through the array and concatenate elements into the variable
    FOR i IN 1..arr.count LOOP
        array_elements := array_elements || ',' || arr(i);
    END LOOP;

    -- Remove the leading comma from the concatenated string
    array_elements := LTRIM(array_elements, ',');

    -- Print the concatenated string
    dbms_output.put_line('Array Elements: ' || array_elements);
END;
/

DECLARE
    -- Declare an array
    my_array sys.odcinumberlist := sys.odcinumberlist(1, 2, 3, 4, 5);
BEGIN
    -- Call the procedure and pass the array as an argument
    print_array_elements(my_array);
END;
/
