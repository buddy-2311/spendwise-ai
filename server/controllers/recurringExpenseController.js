const RecurringExpense = require('../models/RecurringExpense');
const Expense = require('../models/Expense');

const createRecurringExpense = async (req, res) => {
    try {
        const recurringExpense = new RecurringExpense({
            ...req.body,
            userId: req.user._id
        });
        const created = await recurringExpense.save();
        res.status(201).json(created);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getRecurringExpenses = async (req, res) => {
    try {
        const expenses = await RecurringExpense.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getRecurringExpense = async (req, res) => {
    try {
        const expense = await RecurringExpense.findById(req.params.id);
        if (expense && expense.userId.toString() === req.user._id.toString()) {
            res.json(expense);
        } else {
            res.status(404).json({ message: 'Recurring expense not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateRecurringExpense = async (req, res) => {
    try {
        const expense = await RecurringExpense.findById(req.params.id);
        if (expense && expense.userId.toString() === req.user._id.toString()) {
            Object.assign(expense, req.body);
            const updated = await expense.save();
            res.json(updated);
        } else {
            res.status(404).json({ message: 'Recurring expense not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteRecurringExpense = async (req, res) => {
    try {
        const expense = await RecurringExpense.findById(req.params.id);
        if (expense && expense.userId.toString() === req.user._id.toString()) {
            await expense.deleteOne();
            res.json({ message: 'Recurring expense removed' });
        } else {
            res.status(404).json({ message: 'Recurring expense not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        const expense = await RecurringExpense.findById(req.params.id);
        if (expense && expense.userId.toString() === req.user._id.toString()) {
            expense.status = expense.status === 'Active' ? 'Paused' : 'Active';
            const updated = await expense.save();
            res.json(updated);
        } else {
            res.status(404).json({ message: 'Recurring expense not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const generateCurrentMonthRecurringExpenses = async (req, res) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const currentDay = currentDate.getDate();

        const activeRecurring = await RecurringExpense.find({
            userId: req.user._id,
            status: 'Active',
            startDate: { $lte: currentDate }
        });

        let generatedCount = 0;

        for (let re of activeRecurring) {
            if (re.endDate && re.endDate < currentDate) continue;
            if (re.dueDay > currentDay) continue;

            const recType = re.recurrenceType || 'Monthly';

            // Calculate months since start
            const start = new Date(re.startDate);
            const totalMonthsElapsed = (currentYear - start.getFullYear()) * 12 + (currentMonth - (start.getMonth() + 1));

            // For Custom, check if duration is reached
            if (recType === 'Custom' && re.durationMonths && totalMonthsElapsed >= re.durationMonths) continue;

            // Check if should generate this month based on recurrence type
            let shouldGenerate = false;
            if (recType === 'Monthly') {
                if (!(re.lastGeneratedMonth === currentMonth && re.lastGeneratedYear === currentYear)) {
                    shouldGenerate = true;
                }
            } else if (recType === 'Yearly') {
                if (!(re.lastGeneratedYear === currentYear)) {
                    shouldGenerate = true;
                }
            } else if (recType === 'Custom') {
                if (!(re.lastGeneratedMonth === currentMonth && re.lastGeneratedYear === currentYear)) {
                    shouldGenerate = true;
                }
            }

            if (!shouldGenerate) continue;

            const newExpense = new Expense({
                userId: req.user._id,
                category: re.category,
                amount: re.amount,
                note: re.note || re.title,
                date: new Date(currentYear, currentMonth - 1, re.dueDay),
                isRecurring: true,
                recurringExpenseId: re._id,
                autoGenerated: true
            });

            await newExpense.save();

            re.lastGeneratedMonth = currentMonth;
            re.lastGeneratedYear = currentYear;
            await re.save();

            generatedCount++;
        }

        res.json({ message: `Generated ${generatedCount} recurring expenses`, count: generatedCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createRecurringExpense,
    getRecurringExpenses,
    getRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    updateStatus,
    generateCurrentMonthRecurringExpenses
};
