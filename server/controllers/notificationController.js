const Notification = require('../models/Notification');
const SpendingLimit = require('../models/SpendingLimit');
const Subscription = require('../models/Subscription');
const Goal = require('../models/Goal');

const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 }).limit(50);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const generateNotifications = async (req, res) => {
    try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const notifications = [];

        // Check spending limits
        const limits = await SpendingLimit.find({ userId: req.user._id, month: currentMonth, year: currentYear });
        for (const l of limits) {
            if (l.alertAt100 && l.usagePercentage >= 100) {
                const key = `limit-100-${l.category}-${currentMonth}-${currentYear}`;
                const exists = await Notification.findOne({ userId: req.user._id, dedupKey: key });
                if (!exists) {
                    notifications.push({
                        userId: req.user._id, title: 'Spending Limit Exceeded',
                        message: `${l.category} spending limit exceeded! Spent ₹${l.spentAmount.toLocaleString()} of ₹${l.monthlyLimit.toLocaleString()}.`,
                        type: 'Expense', priority: 'High', dedupKey: key, actionLink: '/spending-limits'
                    });
                }
            } else if (l.alertAt90 && l.usagePercentage >= 90) {
                const key = `limit-90-${l.category}-${currentMonth}-${currentYear}`;
                const exists = await Notification.findOne({ userId: req.user._id, dedupKey: key });
                if (!exists) {
                    notifications.push({
                        userId: req.user._id, title: 'Spending Limit Alert',
                        message: `${l.category}: ${l.usagePercentage}% of spending limit used.`,
                        type: 'Expense', priority: 'Medium', dedupKey: key, actionLink: '/spending-limits'
                    });
                }
            }
        }

        // Check upcoming subscription renewals
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const upcomingSubs = await Subscription.find({
            userId: req.user._id, status: 'Active',
            renewalDate: { $gte: now, $lte: threeDaysLater }
        });
        for (const sub of upcomingSubs) {
            const key = `sub-renewal-${sub._id}-${currentMonth}-${currentYear}`;
            const exists = await Notification.findOne({ userId: req.user._id, dedupKey: key });
            if (!exists) {
                const renewalDate = new Date(sub.renewalDate).toLocaleDateString();
                notifications.push({
                    userId: req.user._id, title: 'Subscription Renewal',
                    message: `${sub.name} renewal on ${renewalDate} for ₹${sub.amount.toLocaleString()}.`,
                    type: 'Subscription', priority: 'Medium', dedupKey: key, actionLink: '/subscriptions'
                });
            }
        }

        // Check goal contributions
        const activeGoals = await Goal.find({ userId: req.user._id, status: 'Active' });
        for (const goal of activeGoals) {
            const hasContribution = goal.contributions && goal.contributions.some(
                c => c.month === now.toLocaleString('default', { month: 'long' }) && c.year === currentYear
            );
            if (!hasContribution && now.getDate() >= 15) {
                const key = `goal-contrib-${goal._id}-${currentMonth}-${currentYear}`;
                const exists = await Notification.findOne({ userId: req.user._id, dedupKey: key });
                if (!exists) {
                    notifications.push({
                        userId: req.user._id, title: 'Goal Reminder',
                        message: `You haven't contributed to "${goal.title}" this month. Add a contribution to stay on track.`,
                        type: 'Goal', priority: 'Low', dedupKey: key, actionLink: '/future-planner'
                    });
                }
            }
        }

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        res.json({ message: `Generated ${notifications.length} notifications`, count: notifications.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification || notification.userId.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        notification.isRead = true;
        await notification.save();
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification || notification.userId.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        await notification.deleteOne();
        res.json({ message: 'Notification removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getNotifications, getUnreadCount, generateNotifications,
    markAsRead, markAllAsRead, deleteNotification
};
