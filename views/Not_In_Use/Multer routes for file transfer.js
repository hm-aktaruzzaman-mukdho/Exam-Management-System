const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Specify the directory where uploaded files will be stored

// Route handler for uploading assignment answer PDF
app.post('/assignments/:assignmentId/upload', upload.single('assignmentAnswer'), (req, res) => {
    // Access the uploaded file using req.file
    // Process the uploaded file as needed
    res.send('File uploaded successfully!');
});


const path = require('path');

// Route handler for downloading assignment PDF
app.get('/assignments/:assignmentId/download', (req, res) => {
    const assignmentId = req.params.assignmentId;
    // Logic to fetch the assignment PDF file path from the database based on assignmentId

    // Send the file as a response
    const filePath = 'path/to/assignment.pdf'; // Replace with the actual file path
    res.download(filePath);
});


const multer = require('multer');
upload = multer({ dest: 'uploads/' }); // Specify the directory where uploaded files will be stored

app.post('/assignments/:assignmentId/upload', upload.single('assignmentAnswer'), (req, res) => {
    // Access the uploaded file using req.file
    // Process the uploaded file as needed
    const assignmentId = req.params.assignmentId;
    const uploadedFilePath = req.file.path;
    const assignmentFileName = `Assignment_${assignmentId}`;

    // Logic to move the uploaded file to the "Assignment" directory and rename it
    const fs = require('fs');
    const oldPath = uploadedFilePath;
    const newPath = `Assignment/${assignmentFileName}`;
    fs.rename(oldPath, newPath, (err) => {
        if (err) {
            console.error('Error moving file:', err);
            res.status(500).send('Error uploading assignment answer.');
        } else {
            res.send('Assignment answer uploaded successfully!');
        }
    });
});


const path = require('path');

app.get('/assignments/:assignmentId/download', (req, res) => {
    const assignmentId = req.params.assignmentId;
    const assignmentFileName = `Assignment_${assignmentId}`;

    // Construct the file path to the assignment PDF
    const filePath = path.join(__dirname, 'Assignment', assignmentFileName);

    // Send the file as a response
    res.download(filePath, (err) => {
        if (err) {
            console.error('Error downloading file:', err);
            res.status(500).send('Error downloading assignment.');
        }
    });
});
