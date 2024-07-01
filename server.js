const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append extension
  }
});

const upload = multer({ storage });

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('uploads'));

// Database connection
const db = mysql.createConnection({
  host: 'mysql-de86692-dannydevito-5066.d.aivencloud.com',
  user: 'avnadmin',
  password: 'AVNS_iLh5-8iJS645tqF9L2f',
  port:'11688',
  database: 'eventapp',
  connectTimeout: 20000
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database');
});

// Existing endpoints
app.get('/api/events', (req, res) => {
  db.query('SELECT * FROM events', (err, results) => {
    if (err) {
      console.error('Error fetching events:', err);
      res.status(500).send('Internal server error');
      return;
    }
    res.json(results);
  });
});

app.post('/api/events', upload.single('image'), (req, res) => {
  const { title, date, category, price, organizer, totalSlots, locationUrl, timing, contactNumber } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  const query = 'INSERT INTO events (title, date, category, price, image, organizer, totalSlots, locationUrl, timing, contactNumber) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(query, [title, date, category, price, image, organizer, totalSlots, locationUrl, timing, contactNumber], (err, result) => {
    if (err) {
      console.error('Error inserting event:', err);
      res.status(500).send('Internal server error');
      return;
    }
    res.status(201).json({ 
      id: result.insertId, 
      title, 
      date, 
      category, 
      price, 
      image, 
      organizer, 
      totalSlots, 
      locationUrl, 
      timing,
      contactNumber 
    });
  });
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, email, phoneNumber, password, userType } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (firstName, lastName, email, phoneNumber, password, userType) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [firstName, lastName, email, phoneNumber, hashedPassword, userType], (err, result) => {
      if (err) {
        console.error('Error inserting user:', err);
        res.status(500).send('Internal server error');
        return;
      }
      res.status(201).send('User registered successfully');
    });
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).send('Internal server error');
  }
});

// Login endpoint
app.post('/api/login', (req, res) => {
  console.log('Login endpoint hit');
  const email = req.body.email;
  const password = req.body.password;

  const sqlQuery = 'SELECT * FROM users WHERE email = ?';
  db.query(sqlQuery, [email], (err, data) => {
    if (err) {
      console.error('Error in database query:', err);
      return res.json({ Error: 'Internal Email Error' });
    }

    if (data.length > 0) {
      bcrypt.compare(password, data[0].password, (err, result) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          return res.json({ Error: 'Internal Logging Error' });
        }

        if (result) {
          const token = jwt.sign(
            { email: data[0].email },
            'your_secret_key_here', // Replace with your actual secret key
            { expiresIn: '1h' }
          );
          return res.json({ Status: 'Success', token });
        } else {
          return res.json({ Error: 'Password not matched' });
        }
      });
    } else {
      return res.json({ Error: 'Email Not Existed' });
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
