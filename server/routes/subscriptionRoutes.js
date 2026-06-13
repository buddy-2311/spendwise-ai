const express = require('express');
const router = express.Router();
const {
    createSubscription, getSubscriptions, getSubscriptionSummary,
    getUpcomingRenewals, updateSubscription, deleteSubscription,
    updateSubscriptionStatus, generateRenewalExpenses
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getSubscriptions).post(protect, createSubscription);
router.get('/summary', protect, getSubscriptionSummary);
router.get('/upcoming', protect, getUpcomingRenewals);
router.post('/generate-renewal-expenses', protect, generateRenewalExpenses);
router.route('/:id').put(protect, updateSubscription).delete(protect, deleteSubscription);
router.patch('/:id/status', protect, updateSubscriptionStatus);

module.exports = router;
