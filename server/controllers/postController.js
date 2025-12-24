const Post = require('../models/Post');

exports.createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const post = new Post({
      user: req.userId,
      content,
      image: req.file ? req.file.path : null
    });
    
    await post.save();
    await post.populate('user', 'name username avatar');
    
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'name username avatar')
      .populate('comments.user', 'name username avatar')
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    const index = post.likes.indexOf(req.userId);
    if (index > -1) {
      post.likes.splice(index, 1);
    } else {
      post.likes.push(req.userId);
    }
    
    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.commentPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    post.comments.push({
      user: req.userId,
      content: req.body.content
    });
    
    await post.save();
    await post.populate('comments.user', 'name username avatar');
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};