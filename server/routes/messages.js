const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

// Create or get conversation (private)
router.post('/conversations', auth, messageController.createConversation);

// List conversations of current user
router.get('/conversations', auth, messageController.getConversations);

// List messages in a conversation
router.get('/:conversationId', auth, messageController.getMessages);

// Send a new message
router.post('/', auth, messageController.sendMessage);

module.exports = router;

