const express = require('express');
const router = express.Router();
const {
    createRecurringExpense,
    getRecurringExpenses,
    getRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    updateStatus,
    generateCurrentMonthRecurringExpenses
} = require('../controllers/recurringExpenseController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getRecurringExpenses)
    .post(protect, createRecurringExpense);

router.post('/generate-current-month', protect, generateCurrentMonthRecurringExpenses);

router.route('/:id')
    .get(protect, getRecurringExpense)
    .put(protect, updateRecurringExpense)
    .delete(protect, deleteRecurringExpense);

router.patch('/:id/status', protect, updateStatus);

module.exports = router;
