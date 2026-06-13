const express = require('express');
const router = express.Router();
const { processMessage, getChatHistory, clearChatHistory } = require('../controllers/aiChatController');
const { protect } = require('../middleware/authMiddleware');

router.post('/message', protect, processMessage);
router.get('/history', protect, getChatHistory);
router.delete('/history', protect, clearChatHistory);

module.exports = router;
