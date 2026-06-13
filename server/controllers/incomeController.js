const Income = require('../models/Income');

const getIncome = async (req, res) => {
    try {
        const income = await Income.find({ userId: req.user._id }).sort({ date: -1 });
        res.json(income);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addIncome = async (req, res) => {
    const { source, amount, date } = req.body;
    try {
        const income = new Income({
            userId: req.user._id,
            source,
            amount,
            date
        });
        const createdIncome = await income.save();
        res.status(201).json(createdIncome);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteIncome = async (req, res) => {
    try {
        const income = await Income.findById(req.params.id);
        if (income && income.userId.toString() === req.user._id.toString()) {
            await income.deleteOne();
            res.json({ message: 'Income removed' });
        } else {
            res.status(404).json({ message: 'Income not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getIncome, addIncome, deleteIncome };
