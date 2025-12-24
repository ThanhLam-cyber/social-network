const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIO = require('socket.io');
require('dotenv').config();

const app = express();

// CORS / Socket allowed origin
const allowedOrigin = process.env.FRONTEND_ORIGIN || '*';

// Middleware
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Database connection
const mongoUri =  'mongodb+srv://lamdt23ns_db_user:hfmMMLNs63bAVEaa@cluster0.ierzk1s.mongodb.net/social-network?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoUri)
  .then(() => console.log(`✅ MongoDB connected: ${mongoUri.replace(/\/\/.*:.*@/, '//****:****@')}`)) // Ẩn password trong log
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/messages', require('./routes/messages'));

// HTTP/HTTPS server selection
const PORT = process.env.PORT || 3000;
const sslKey = process.env.SSL_KEY_PATH;
const sslCert = process.env.SSL_CERT_PATH;

let server;
if (sslKey && sslCert && fs.existsSync(sslKey) && fs.existsSync(sslCert)) {
  const credentials = {
    key: fs.readFileSync(sslKey),
    cert: fs.readFileSync(sslCert),
  };
  server = https.createServer(credentials, app);
} else {
  server = http.createServer(app);
}

// ✅ Khởi tạo Socket.IO SAU KHI đã có server instance
const io = socketIO(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
});

// Socket.IO handlers
const messageHandler = require('./socket/messageHandler');
const callHandler = require('./socket/callHandler');

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('user-online', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('user-status', { userId, status: 'online' });
  });

  messageHandler(io, socket, onlineUsers);
  callHandler(io, socket, onlineUsers);

  socket.on('disconnect', () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('user-status', { userId, status: 'offline' });
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  const protocol = sslKey && sslCert ? 'HTTPS' : 'HTTP';
  console.log(`🚀 ${protocol} server running on port ${PORT}`);
});