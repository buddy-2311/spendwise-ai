const express = require('express');
const router = express.Router();
const {
    getCurrentSaving, setTarget, addSavedAmount, getAllSavings
} = require('../controllers/compulsorySavingController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getCurrentSaving);
router.get('/all', protect, getAllSavings);
router.post('/target', protect, setTarget);
router.post('/add-saved', protect, addSavedAmount);

module.exports = router;
