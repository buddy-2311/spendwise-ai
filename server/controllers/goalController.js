const Goal = require('../models/Goal');
const User = require('../models/User');

const createGoal = async (req, res) => {
    try {
        const goal = new Goal({ ...req.body, userId: req.user._id });
        const createdGoal = await goal.save();
        res.status(201).json(createdGoal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGoals = async (req, res) => {
    try {
        const goals = await Goal.find({ userId: req.user._id }).sort({ targetDate: 1 });
        res.json(goals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGoal = async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        if (goal && goal.userId.toString() === req.user._id.toString()) {
            res.json(goal);
        } else {
            res.status(404).json({ message: 'Goal not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateGoal = async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        if (goal && goal.userId.toString() === req.user._id.toString()) {
            Object.assign(goal, req.body);
            const updatedGoal = await goal.save();
            res.json(updatedGoal);
        } else {
            res.status(404).json({ message: 'Goal not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteGoal = async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        if (goal && goal.userId.toString() === req.user._id.toString()) {
            await goal.deleteOne();
            res.json({ message: 'Goal removed' });
        } else {
            res.status(404).json({ message: 'Goal not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateProgress = async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        if (goal && goal.userId.toString() === req.user._id.toString()) {
            goal.currentAmount = req.body.currentAmount;
            if (goal.currentAmount >= goal.targetAmount) {
                goal.status = 'Completed';
            }
            const updatedGoal = await goal.save();
            res.json(updatedGoal);
        } else {
            res.status(404).json({ message: 'Goal not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        if (goal && goal.userId.toString() === req.user._id.toString()) {
            goal.status = req.body.status;
            const updatedGoal = await goal.save();
            res.json(updatedGoal);
        } else {
            res.status(404).json({ message: 'Goal not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGoalSummary = async (req, res) => {
    try {
        const goals = await Goal.find({ userId: req.user._id });
        const summary = {
            totalGoals: goals.length,
            totalTarget: goals.reduce((acc, curr) => acc + curr.targetAmount, 0),
            totalSaved: goals.reduce((acc, curr) => acc + curr.currentAmount, 0),
            completedGoals: goals.filter(g => g.status === 'Completed').length,
            monthlyRequired: goals.reduce((acc, curr) => acc + (curr.monthlyContribution || 0), 0)
        };
        summary.remainingAmount = summary.totalTarget - summary.totalSaved;
        res.json(summary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getFutureInsights = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const goals = await Goal.find({ userId: req.user._id, status: 'Active' });
        const insights = [];

        const totalMonthlyRequired = goals.reduce((acc, curr) => acc + (curr.monthlyContribution || 0), 0);
        
        if (user.monthlyIncome && totalMonthlyRequired > (user.monthlyIncome * 0.4)) {
            insights.push("Your total required monthly saving exceeds 40% of your income. Consider extending your goal timelines.");
        }

        const emergencyGoal = goals.find(g => g.category === 'Emergency Fund');
        if (!emergencyGoal) {
            insights.push("You should prioritize creating an Emergency Fund goal before saving for other items.");
        }

        const currentMonth = new Date().toLocaleString('default', { month: 'long' });
        const currentYear = new Date().getFullYear();

        let habitsBuilding = 0;
        goals.forEach(goal => {
            const hasContributedThisMonth = goal.contributions?.some(c => c.month === currentMonth && c.year === currentYear);
            
            if (hasContributedThisMonth) {
                insights.push(`Great job. You have added this month's saving for your ${goal.title} goal.`);
                habitsBuilding++;
            } else if (goal.monthlyContribution > 0) {
                insights.push(`You have not added this month's saving for your ${goal.title} goal yet.`);
            }

            if (goal.targetDate) {
                const monthsLeft = (new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24 * 30);
                if (monthsLeft > 0 && monthsLeft < 3 && goal.currentAmount < goal.targetAmount * 0.5) {
                    insights.push(`Your ${goal.title} goal is due soon, but you are behind. Consider adjusting the target date.`);
                }
            }
        });

        if (habitsBuilding >= 2) {
            insights.push("You are building a strong saving habit by consistently contributing to multiple goals!");
        }

        if (insights.length === 0) {
            insights.push("You are on track with your financial planning goals. Keep up the great work!");
        }

        res.json({ insights });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addMonthlyContribution = async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        if (!goal || goal.userId.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Goal not found' });
        }

        const currentDate = new Date();
        const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
        const currentYear = currentDate.getFullYear();

        const alreadyAdded = goal.contributions?.some(c => c.month === currentMonth && c.year === currentYear);
        if (alreadyAdded) {
            return res.status(400).json({ message: 'Monthly contribution already added for this month.' });
        }

        const contributionAmount = goal.monthlyContribution;
        if (!contributionAmount || contributionAmount <= 0) {
            return res.status(400).json({ message: 'Monthly contribution amount is invalid.' });
        }

        goal.currentAmount += contributionAmount;
        if (goal.currentAmount >= goal.targetAmount) {
            goal.currentAmount = goal.targetAmount;
            goal.status = 'Completed';
        }

        goal.contributions.push({
            amount: contributionAmount,
            month: currentMonth,
            year: currentYear,
            date: currentDate
        });

        const updatedGoal = await goal.save();
        res.json(updatedGoal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const removeMonthlyContribution = async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        if (!goal || goal.userId.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Goal not found' });
        }

        const currentDate = new Date();
        const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
        const currentYear = currentDate.getFullYear();

        const contributionIndex = goal.contributions?.findIndex(c => c.month === currentMonth && c.year === currentYear);
        
        if (contributionIndex === -1) {
            return res.status(400).json({ message: 'No contribution found for this month to remove.' });
        }

        const contributionAmount = goal.contributions[contributionIndex].amount;
        goal.currentAmount -= contributionAmount;
        
        if (goal.currentAmount < goal.targetAmount && goal.status === 'Completed') {
            goal.status = 'Active';
        }

        goal.contributions.splice(contributionIndex, 1);
        const updatedGoal = await goal.save();
        
        res.json(updatedGoal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createGoal, getGoals, getGoal, updateGoal, deleteGoal,
    updateProgress, updateStatus, getGoalSummary, getFutureInsights,
    addMonthlyContribution, removeMonthlyContribution
};
