const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, updatePreferences, updateTheme, changePassword } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.route('/profile').get(protect, getProfile).put(protect, updateProfile);
router.route('/preferences').put(protect, updatePreferences);
router.route('/theme').put(protect, updateTheme);
router.route('/change-password').put(protect, changePassword);

module.exports = router;
