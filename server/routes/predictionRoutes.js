const express = require('express');
const router = express.Router();
const { predictNextMonth, getCategoryPredictions, getTrends } = require('../controllers/predictionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/next-month', protect, predictNextMonth);
router.get('/category', protect, getCategoryPredictions);
router.get('/trends', protect, getTrends);

module.exports = router;
