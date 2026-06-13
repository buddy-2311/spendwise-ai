const Expense = require('../models/Expense');
const SpendingLimit = require('../models/SpendingLimit');

const updateBudgetAndLimits = async (userId, category, date) => {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const expenses = await Expense.find({
        userId, category, date: { $gte: startDate, $lte: endDate }
    });
    const spentAmount = expenses.reduce((s, e) => s + e.amount, 0);

    // Update spending limit
    const limit = await SpendingLimit.findOne({ userId, category, month, year });
    if (limit) {
        limit.spentAmount = spentAmount;
        limit.remainingAmount = Math.max(0, limit.monthlyLimit - spentAmount);
        limit.usagePercentage = limit.monthlyLimit > 0 ? Math.round((spentAmount / limit.monthlyLimit) * 100) : 0;
        await limit.save();
    }
};

const getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find({ userId: req.user._id }).sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addExpense = async (req, res) => {
    const { category, amount, note, date } = req.body;
    try {
        const expense = new Expense({
            userId: req.user._id,
            category,
            amount,
            note,
            date
        });
        const createdExpense = await expense.save();

        // Update budget and spending limit
        await updateBudgetAndLimits(req.user._id, category, createdExpense.date);

        res.status(201).json(createdExpense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (expense && expense.userId.toString() === req.user._id.toString()) {
            const { category, date } = expense;
            await expense.deleteOne();

            // Update budget and spending limit
            await updateBudgetAndLimits(req.user._id, category, date);

            res.json({ message: 'Expense removed' });
        } else {
            res.status(404).json({ message: 'Expense not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getExpenses, addExpense, deleteExpense };
