const express = require('express');
const router = express.Router();
const { getIncome, addIncome, deleteIncome } = require('../controllers/incomeController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getIncome).post(protect, addIncome);
router.route('/:id').delete(protect, deleteIncome);

module.exports = router;
