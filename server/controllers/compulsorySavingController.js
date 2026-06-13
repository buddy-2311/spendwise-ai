const CompulsorySaving = require('../models/CompulsorySaving');

const getCurrentSaving = async (req, res) => {
    try {
        const now = new Date();
        const month = parseInt(req.query.month) || (now.getMonth() + 1);
        const year = parseInt(req.query.year) || now.getFullYear();
        let saving = await CompulsorySaving.findOne({ userId: req.user._id, month, year });
        if (!saving) {
            saving = { month, year, targetAmount: 0, savedAmount: 0, status: 'Pending' };
        }
        const remaining = Math.max(0, saving.targetAmount - saving.savedAmount);
        res.json({ ...saving.toObject?.() || saving, remaining });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const setTarget = async (req, res) => {
    try {
        const now = new Date();
        const month = parseInt(req.body.month) || (now.getMonth() + 1);
        const year = parseInt(req.body.year) || now.getFullYear();
        const { targetAmount } = req.body;
        if (!targetAmount || targetAmount <= 0) {
            return res.status(400).json({ message: 'Target amount must be > 0' });
        }
        let saving = await CompulsorySaving.findOne({ userId: req.user._id, month, year });
        if (saving) {
            saving.targetAmount = targetAmount;
        } else {
            saving = new CompulsorySaving({ userId: req.user._id, month, year, targetAmount });
        }
        saving.status = saving.savedAmount >= saving.targetAmount ? 'Completed' : 'Pending';
        await saving.save();
        const remaining = Math.max(0, saving.targetAmount - saving.savedAmount);
        res.json({ ...saving.toObject(), remaining });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addSavedAmount = async (req, res) => {
    try {
        const now = new Date();
        const month = parseInt(req.body.month) || (now.getMonth() + 1);
        const year = parseInt(req.body.year) || now.getFullYear();
        const { savedAmount } = req.body;
        if (!savedAmount || savedAmount <= 0) {
            return res.status(400).json({ message: 'Saved amount must be > 0' });
        }
        let saving = await CompulsorySaving.findOne({ userId: req.user._id, month, year });
        if (!saving) {
            return res.status(404).json({ message: 'No saving target set for this month' });
        }
        saving.savedAmount = (saving.savedAmount || 0) + savedAmount;
        saving.status = saving.savedAmount >= saving.targetAmount ? 'Completed' : 'Pending';
        await saving.save();
        const remaining = Math.max(0, saving.targetAmount - saving.savedAmount);
        res.json({ ...saving.toObject(), remaining });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllSavings = async (req, res) => {
    try {
        const savings = await CompulsorySaving.find({ userId: req.user._id }).sort({ year: -1, month: -1 });
        res.json(savings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getCurrentSaving, setTarget, addSavedAmount, getAllSavings };
