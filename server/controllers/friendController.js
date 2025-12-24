const Friendship = require('../models/Friendship');
const User = require('../models/User');

exports.sendFriendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    
    const existing = await Friendship.findOne({
      $or: [
        { requester: req.userId, recipient: recipientId },
        { requester: recipientId, recipient: req.userId }
      ]
    });
    
    if (existing) {
      return res.status(400).json({ message: 'Friend request already exists' });
    }
    
    const friendship = new Friendship({
      requester: req.userId,
      recipient: recipientId
    });
    
    await friendship.save();
    res.status(201).json(friendship);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.acceptFriendRequest = async (req, res) => {
  try {
    const friendship = await Friendship.findByIdAndUpdate(
      req.params.id,
      { status: 'accepted' },
      { new: true }
    );
    
    res.json(friendship);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectFriendRequest = async (req, res) => {
  try {
    const friendship = await Friendship.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );

    res.json(friendship);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeFriend = async (req, res) => {
  try {
    const removed = await Friendship.findOneAndDelete({
      $or: [
        { requester: req.userId, recipient: req.params.id },
        { requester: req.params.id, recipient: req.userId }
      ]
    });

    if (!removed) {
      return res.status(404).json({ message: 'Friendship not found' });
    }

    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { requester: req.userId, status: 'accepted' },
        { recipient: req.userId, status: 'accepted' }
      ]
    }).populate('requester recipient', 'name username avatar status');
    
    const friends = friendships.map(f => 
      f.requester._id.toString() === req.userId ? f.recipient : f.requester
    );
    
    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFriendRequests = async (req, res) => {
  try {
    const requests = await Friendship.find({
      recipient: req.userId,
      status: 'pending'
    }).populate('requester', 'name username avatar');
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};