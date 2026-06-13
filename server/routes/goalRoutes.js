const express = require('express');
const router = express.Router();
const {
    createGoal, getGoals, getGoal, updateGoal, deleteGoal,
    updateProgress, updateStatus, getGoalSummary, getFutureInsights,
    addMonthlyContribution, removeMonthlyContribution
} = require('../controllers/goalController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getGoals)
    .post(protect, createGoal);

router.get('/summary/dashboard', protect, getGoalSummary);
router.get('/insights/future', protect, getFutureInsights);

router.route('/:id')
    .get(protect, getGoal)
    .put(protect, updateGoal)
    .delete(protect, deleteGoal);

router.patch('/:id/progress', protect, updateProgress);
router.patch('/:id/status', protect, updateStatus);

router.patch('/:id/add-monthly-contribution', protect, addMonthlyContribution);
router.delete('/:id/remove-monthly-contribution', protect, removeMonthlyContribution);

module.exports = router;
