const Budget = require('../models/Budget');

const getBudget = async (req, res) => {
    try {
        const budgets = await Budget.find({ userId: req.user._id });
        res.json(budgets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const setBudget = async (req, res) => {
    const { month, budgetAmount } = req.body;
    try {
        let budget = await Budget.findOne({ userId: req.user._id, month });
        if (budget) {
            budget.budgetAmount = budgetAmount;
            const updatedBudget = await budget.save();
            res.json(updatedBudget);
        } else {
            budget = new Budget({
                userId: req.user._id,
                month,
                budgetAmount
            });
            const createdBudget = await budget.save();
            res.status(201).json(createdBudget);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getBudget, setBudget };
