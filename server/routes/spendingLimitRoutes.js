const express = require('express');
const router = express.Router();
const {
    createSpendingLimit, getSpendingLimits, getSpendingLimitSummary,
    updateSpendingLimit, deleteSpendingLimit, recalculateSpendingLimits,
    getBalanceSuggestions, applyBalance
} = require('../controllers/spendingLimitController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getSpendingLimits).post(protect, createSpendingLimit);
router.get('/summary', protect, getSpendingLimitSummary);
router.post('/recalculate', protect, recalculateSpendingLimits);
router.post('/balance-suggestions', protect, getBalanceSuggestions);
router.post('/apply-balance', protect, applyBalance);
router.route('/:id').put(protect, updateSpendingLimit).delete(protect, deleteSpendingLimit);

module.exports = router;
