module.exports = (io, socket, onlineUsers) => {
  socket.on('send-message', async (data) => {
    const { conversationId, senderId, recipientId, content } = data;
    
    const recipientSocketId = onlineUsers.get(recipientId);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('receive-message', {
        conversationId,
        senderId,
        content,
        timestamp: new Date()
      });
    }
  });

  socket.on('typing', (data) => {
    const { recipientId, isTyping } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user-typing', {
        userId: data.userId,
        isTyping
      });
    }
  });
};