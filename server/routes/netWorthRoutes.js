const express = require('express');
const router = express.Router();
const {
    createNetWorthItem, getNetWorthItems, getNetWorthSummary,
    getNetWorthHistory, updateNetWorthItem, deleteNetWorthItem
} = require('../controllers/netWorthController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getNetWorthItems).post(protect, createNetWorthItem);
router.get('/summary', protect, getNetWorthSummary);
router.get('/history', protect, getNetWorthHistory);
router.route('/:id').put(protect, updateNetWorthItem).delete(protect, deleteNetWorthItem);

module.exports = router;
