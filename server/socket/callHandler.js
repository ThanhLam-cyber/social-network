module.exports = (io, socket, onlineUsers) => {
  socket.on('call-user', (data) => {
    const { to, from, signal } = data;
    const recipientSocketId = onlineUsers.get(to);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('incoming-call', {
        from,
        signal
      });
    }
  });

  socket.on('accept-call', (data) => {
    const { to, signal } = data;
    const callerSocketId = onlineUsers.get(to);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-accepted', {
        signal
      });
    }
  });

  socket.on('reject-call', (data) => {
    const { to } = data;
    const callerSocketId = onlineUsers.get(to);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-rejected');
    }
  });

  socket.on('end-call', (data) => {
    const { to } = data;
    const recipientSocketId = onlineUsers.get(to);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('call-ended');
    }
  });
};