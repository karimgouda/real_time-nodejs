const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const { join } = require('path');

const app = express();
const server = createServer(app);
const io = new Server(server);

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'nageed'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Database connected successfully');
});

// Middleware

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.get('/api/messages/:teacher_id/:user_id', (req, res) => {
  const { teacher_id, user_id } = req.params;
  const sql = 'SELECT * FROM cahts WHERE instructor_id = ? AND user_id = ?';

  db.query(sql, [teacher_id, user_id], (err, results) => {
    if (err) {
      console.error('Failed to get messages', err);
      return res.status(500).json({ error: 'Failed to retrieve messages' });
    }

    res.json(results);
  });
});

app.post('/api/messages', (req, res) => {
  const { teacher_id, user_id, message } = req.body;

  if (!teacher_id || !user_id || !message) {
    return res.status(400).json({ error: 'Missing fields: teacher_id, user_id, or message' });
  }

  const sql = 'INSERT INTO cahts (instructor_id, user_id, message) VALUES (?, ?, ?)';

  db.query(sql, [teacher_id, user_id, message], (err, result) => {
    if (err) {
      console.error('Failed to insert message', err);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    res.status(201).json({ message: 'Message sent successfully', messageId: result.insertId });
    console.log('created message')
    io.emit('chat_message', { teacher_id, user_id, message });
  });
});




io.on('connection', (socket) => {
  console.log('Socket connected');

  socket.emit('connection status', { status: 'connected' });

  socket.on('chat_message', (data) => {
    console.log('Received chat message:', data);
    const { teacher_id, user_id, message } = data;

    if (!teacher_id || !user_id || !message) {
      console.error('Invalid message data');
      socket.emit('error', 'Invalid message data');
      return;
    }

    const sql = "INSERT INTO cahts (`instructor_id`, `user_id`, `message`) VALUES (?, ?, ?)";

    db.query(sql, [teacher_id, user_id, message], (err, result) => {
      if (err) {
        console.error('Failed to store message', err);
        socket.emit('error', 'Failed to store message');
        return;
      }

      console.log('Message stored successfully');

      socket.emit('message status', {
        status: 'success',
        messageId: result.insertId,
        message: 'Message stored successfully'
      });


      io.emit('chat message', { teacher_id, user_id, message });
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
