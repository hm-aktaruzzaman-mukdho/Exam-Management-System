// Route to render the upload page
app.get('/aa/:appointmentid', (req, res) => {
    console.log(req.params.appointmentid);
    res.render('upload.ejs', { imageUrl: null,appointmentid: req.params.appointmentid});
  });
  
  // Route for uploading prescription
  app.post('/aa/:appointmentid/upload', upload.single('image'), async (req, res) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).send('No file uploaded');
      }
  
      const appointmentId = req.params.appointmentid;
  
      // Call the stored function to get the appointment day
      const getAppointmentDayQuery = `BEGIN :day := GET_APPOINTMENT_DAY(:scheduleId); END;`;
      const dayBind = { day: { dir: oracledb.BIND_OUT, type: oracledb.DATE }, scheduleId: null };
  
      // Get the ScheduleID associated with the appointment
      const appointmentQuery = 'SELECT ScheduleID FROM Appointment WHERE AppointmentID = :appointmentId';
      const appointmentResult = await connection.execute(appointmentQuery, [appointmentId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const scheduleId = appointmentResult.rows[0].SCHEDULEID; // Ensure proper case here
  
      dayBind.scheduleId = scheduleId;
  
      // Execute the query to get the appointment day
      const result = await connection.execute(getAppointmentDayQuery, dayBind);
  
      // Extract the appointment day from the result
      const appointmentDate = new Date(result.outBinds.day);
  
      // Check if appointment day is in the future
      // const currentDate = new Date();
      // if (currentDate < appointmentDate) {
      //   return res.status(400).send('Prescription upload is not allowed before the appointment date');
      // }
  
      // Proceed with uploading prescription
      const uniqueFilename = Date.now() + '-' + req.file.originalname;
      const destinationPath = 'public/' + uniqueFilename;
      fs.renameSync(req.file.path, destinationPath);
      const imageUrl = 'http://localhost:3300/images/' + uniqueFilename;
  
      // Insert prescription into database
      const insertPrescriptionQuery = 'INSERT INTO Prescription (url, AppointmentID) VALUES (:url, :appointmentId)';
      const prescriptionBinds = [imageUrl, appointmentId];
      await connection.execute(insertPrescriptionQuery, prescriptionBinds, { autoCommit: true });
  
      const suggestedTests = JSON.parse(req.body.testsArray);
      if (suggestedTests && suggestedTests.length > 0) {
        const insertTestQuery = 'INSERT INTO suggested_tests (test_name, appointmentid) VALUES (:testName, :appointmentId)';
        for (const test of suggestedTests) {
          console.log('Inserting test:', test);
          const testBinds = [test, req.params.appointmentid];
          await connection.execute(insertTestQuery, testBinds, { autoCommit: true });
        }
      }
  
      await connection.close();
      // Other code for inserting suggested tests...
  
      res.render('upload.ejs', { imageUrl, appointmentid: appointmentId });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('An error occurred while processing the upload');
    }
  });
  
  
  
  // Serve the uploaded images statically
  app.use('/images', express.static('public/images'));
  
  
  app.get('/download/:appointmentid', async (req, res) => {
    try {
      const connection = await oracledb.getConnection(dbConfig);
      const id = req.session.user.id;
      const appointmentid = req.params.appointmentid;
  
      // Query to fetch image URLs from the PRESCRIPTION table
      const imageQuery = 'SELECT url FROM PRESCRIPTION p JOIN APPOINTMENT a ON p.APPOINTMENTID = a.APPOINTMENTID WHERE a.PATIENTID = :id AND a.APPOINTMENTID = :appointmentid';
      const imageResult = await connection.execute(imageQuery, { id: id, appointmentid: appointmentid });
      const imageUrls = imageResult.rows.map(row => row[0]);
  
      // Query to fetch suggested tests from the suggested_test table
      const testQuery = 'SELECT test_name FROM suggested_tests WHERE appointmentid IN (SELECT appointmentid FROM APPOINTMENT WHERE patientid = :id AND appointmentid = :appointmentid)';
      const testResult = await connection.execute(testQuery, { id: id, appointmentid: appointmentid });
      const suggestedTests = testResult.rows.map(row => row[0]);
  var diagnosticCenters = [];
  //   const suggestedTests = tests.rows.map(row => row[0]);
  if(testResult.rows.length > 0){
    const centerQuery = `
    SELECT d.NAME, d.ADDRESS, d.CONTACTNUMBER,d.DIAGNOSTICCENTERID
    FROM DIAGNOSTICCENTER d
    JOIN OFFEREDTEST ot ON d.DIAGNOSTICCENTERID = ot.DIAGNOSTICCENTERID
    WHERE ot.TESTNAME IN (${suggestedTests.map((test, index) => `:test${index}`).join(', ')})
    `;
         const centerResult = await connection.execute(centerQuery, suggestedTests);
         diagnosticCenters = centerResult.rows;
        console.log(diagnosticCenters);
         await connection.close();
  }
      res.render('download.ejs', { imageUrls, suggestedTests, diagnosticCenters, id: req.session.user.id, appointmentid: req.params.appointmentid });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('An error occurred while retrieving data');
    }
  });