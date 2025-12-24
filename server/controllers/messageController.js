const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Tạo hoặc lấy conversation giữa current user và target user
exports.createConversation = async (req, res) => {
  try {
    const { participantId } = req.body; // user còn lại
    if (!participantId) {
      return res.status(400).json({ message: 'participantId is required' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, participantId], $size: 2 },
      type: 'private',
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.userId, participantId],
        type: 'private',
      });
      await conversation.save();
    }

    await conversation.populate('participants', 'name username avatar status');
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId
    })
    .populate('participants', 'name username avatar status')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });
    
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      conversation: req.params.conversationId
    })
    .populate('sender', 'name username avatar')
    .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, content, participantId } = req.body;
    let targetConversationId = conversationId;

    // Nếu chưa có conversationId, tạo (hoặc lấy) dựa trên participantId
    if (!targetConversationId) {
      if (!participantId) {
        return res.status(400).json({ message: 'conversationId hoặc participantId là bắt buộc' });
      }
      let conversation = await Conversation.findOne({
        participants: { $all: [req.userId, participantId], $size: 2 },
        type: 'private',
      });
      if (!conversation) {
        conversation = new Conversation({
          participants: [req.userId, participantId],
          type: 'private',
        });
        await conversation.save();
      }
      targetConversationId = conversation._id;
    }
    
    const message = new Message({
      conversation: targetConversationId,
      sender: req.userId,
      content
    });
    
    await message.save();
    await message.populate('sender', 'name username avatar');
    
    await Conversation.findByIdAndUpdate(targetConversationId, {
      lastMessage: message._id,
      updatedAt: new Date()
    });
    
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};