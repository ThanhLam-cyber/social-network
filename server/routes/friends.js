const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const auth = require('../middleware/auth');

router.post('/request', auth, friendController.sendFriendRequest);
router.post('/accept/:id', auth, friendController.acceptFriendRequest);
router.post('/reject/:id', auth, friendController.rejectFriendRequest);
router.delete('/:id', auth, friendController.removeFriend);
router.get('/', auth, friendController.getFriends);
router.get('/requests', auth, friendController.getFriendRequests);

module.exports = router;