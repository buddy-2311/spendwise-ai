const User = require('../models/User');
const Expense = require('../models/Expense');
const Goal = require('../models/Goal');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const NetWorthItem = require('../models/NetWorthItem');
const SpendingLimit = require('../models/SpendingLimit');
const ChatMessage = require('../models/ChatMessage');

const getDashboardStats = async (req, res) => {
    try {
        const usersCount = await User.countDocuments();
        const expensesCount = await Expense.countDocuments();
        const goalsCount = await Goal.countDocuments();
        const subscriptionsCount = await Subscription.countDocuments();
        const notificationsCount = await Notification.countDocuments();
        const spendingLimitsCount = await SpendingLimit.countDocuments();

        // Average net worth
        const allNetWorth = await NetWorthItem.aggregate([
            { $group: { _id: '$userId', assets: { $sum: { $cond: [{ $eq: ['$type', 'Asset'] }, '$amount', 0] } }, liabilities: { $sum: { $cond: [{ $eq: ['$type', 'Liability'] }, '$amount', 0] } } } }
        ]);
        const avgNetWorth = allNetWorth.length > 0
            ? Math.round(allNetWorth.reduce((s, u) => s + (u.assets - u.liabilities), 0) / allNetWorth.length)
            : 0;

        // Most common spending limit category
        const limitCategories = await SpendingLimit.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }, { $limit: 1 }
        ]);
        const topLimitCategory = limitCategories.length > 0 ? limitCategories[0]._id : 'N/A';

        // Most used AI chat questions
        const topQuestions = await ChatMessage.aggregate([
            { $match: { role: 'user' } },
            { $group: { _id: '$message', count: { $sum: 1 } } },
            { $sort: { count: -1 } }, { $limit: 5 }
        ]);

        res.json({
            usersCount,
            expensesCount,
            activeUsers: usersCount,
            goalsCount,
            subscriptionsCount,
            notificationsCount,
            spendingLimitsCount,
            avgNetWorth,
            topLimitCategory,
            topQuestions: topQuestions.map(q => ({ question: q._id, count: q.count }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getDashboardStats };
