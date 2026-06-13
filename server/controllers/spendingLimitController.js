const SpendingLimit = require('../models/SpendingLimit');
const Expense = require('../models/Expense');
const Notification = require('../models/Notification');

// Priority order for non-essential categories (reduce from these first)
const NON_ESSENTIAL_ORDER = ['Shopping', 'Entertainment', 'Travel', 'Subscriptions', 'Others'];
// Essential categories (avoid reducing these)
const ESSENTIAL_CATEGORIES = ['Rent', 'Bills', 'Healthcare', 'Education', 'Food'];

const createSpendingLimit = async (req, res) => {
    try {
        const { category, monthlyLimit, alertAt70, alertAt90, alertAt100, month, year } = req.body;
        if (!category || !monthlyLimit || monthlyLimit <= 0 || !month || !year) {
            return res.status(400).json({ message: 'Category, valid monthly limit, month and year are required' });
        }
        const existing = await SpendingLimit.findOne({ userId: req.user._id, category, month, year });
        if (existing) {
            return res.status(400).json({ message: 'Spending limit already exists for this category this month' });
        }

        // Calculate current spend
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const expenses = await Expense.find({
            userId: req.user._id, category,
            date: { $gte: startDate, $lte: endDate }
        });
        const spentAmount = expenses.reduce((s, e) => s + e.amount, 0);
        const remainingAmount = Math.max(0, monthlyLimit - spentAmount);
        const usagePercentage = Math.round((spentAmount / monthlyLimit) * 100);

        const limit = new SpendingLimit({
            userId: req.user._id, category, monthlyLimit, spentAmount,
            remainingAmount, usagePercentage,
            alertAt70: alertAt70 !== false, alertAt90: alertAt90 !== false, alertAt100: alertAt100 !== false,
            month, year
        });
        const created = await limit.save();
        res.status(201).json(created);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSpendingLimits = async (req, res) => {
    try {
        const filter = { userId: req.user._id };
        if (req.query.month) filter.month = parseInt(req.query.month);
        if (req.query.year) filter.year = parseInt(req.query.year);
        const limits = await SpendingLimit.find(filter).sort({ category: 1 });
        res.json(limits);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSpendingLimitSummary = async (req, res) => {
    try {
        const now = new Date();
        const month = parseInt(req.query.month) || (now.getMonth() + 1);
        const year = parseInt(req.query.year) || now.getFullYear();
        const limits = await SpendingLimit.find({ userId: req.user._id, month, year });

        const totalLimit = limits.reduce((s, l) => s + l.monthlyLimit, 0);
        const totalSpent = limits.reduce((s, l) => s + l.spentAmount, 0);
        const safeCount = limits.filter(l => l.usagePercentage < 70).length;
        const warningCount = limits.filter(l => l.usagePercentage >= 70 && l.usagePercentage < 90).length;
        const dangerCount = limits.filter(l => l.usagePercentage >= 90 && l.usagePercentage < 100).length;
        const exceededCount = limits.filter(l => l.usagePercentage >= 100).length;

        res.json({
            totalLimit, totalSpent, totalCategories: limits.length,
            safeCount, warningCount, dangerCount, exceededCount, limits
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateSpendingLimit = async (req, res) => {
    try {
        const limit = await SpendingLimit.findById(req.params.id);
        if (!limit || limit.userId.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Spending limit not found' });
        }
        if (req.body.monthlyLimit !== undefined) {
            limit.monthlyLimit = req.body.monthlyLimit;
        }
        if (req.body.alertAt70 !== undefined) limit.alertAt70 = req.body.alertAt70;
        if (req.body.alertAt90 !== undefined) limit.alertAt90 = req.body.alertAt90;
        if (req.body.alertAt100 !== undefined) limit.alertAt100 = req.body.alertAt100;

        limit.remainingAmount = Math.max(0, limit.monthlyLimit - limit.spentAmount);
        limit.usagePercentage = Math.round((limit.spentAmount / limit.monthlyLimit) * 100);

        const updated = await limit.save();
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteSpendingLimit = async (req, res) => {
    try {
        const limit = await SpendingLimit.findById(req.params.id);
        if (!limit || limit.userId.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Spending limit not found' });
        }
        await limit.deleteOne();
        res.json({ message: 'Spending limit removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const recalculateSpendingLimits = async (req, res) => {
    try {
        const now = new Date();
        const month = parseInt(req.body.month) || (now.getMonth() + 1);
        const year = parseInt(req.body.year) || now.getFullYear();

        const limits = await SpendingLimit.find({ userId: req.user._id, month, year });
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        for (const limit of limits) {
            const expenses = await Expense.find({
                userId: req.user._id, category: limit.category,
                date: { $gte: startDate, $lte: endDate }
            });
            limit.spentAmount = expenses.reduce((s, e) => s + e.amount, 0);
            limit.remainingAmount = Math.max(0, limit.monthlyLimit - limit.spentAmount);
            limit.usagePercentage = Math.round((limit.spentAmount / limit.monthlyLimit) * 100);
            await limit.save();
        }
        const updatedLimits = await SpendingLimit.find({ userId: req.user._id, month, year });
        res.json(updatedLimits);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ====== NEW: Budget Balance Suggestions ======
const getBalanceSuggestions = async (req, res) => {
    try {
        const { overspentCategory } = req.body;
        if (!overspentCategory) {
            return res.status(400).json({ message: 'Overspent category is required' });
        }

        const now = new Date();
        const month = parseInt(req.body.month) || (now.getMonth() + 1);
        const year = parseInt(req.body.year) || now.getFullYear();

        // Get the overspent category limit
        const overspentLimit = await SpendingLimit.findOne({
            userId: req.user._id, category: overspentCategory, month, year
        });

        if (!overspentLimit) {
            return res.status(404).json({ message: 'Spending limit not found for this category' });
        }

        const extraAmount = overspentLimit.spentAmount - overspentLimit.monthlyLimit;
        if (extraAmount <= 0) {
            return res.status(400).json({ message: 'This category has not exceeded its limit' });
        }

        // Get all other limits for this month
        const allLimits = await SpendingLimit.find({
            userId: req.user._id,
            month, year,
            category: { $ne: overspentCategory }
        });

        // Filter out categories that are already exceeded
        const availableLimits = allLimits.filter(l => l.usagePercentage < 100);

        // Sort by priority: non-essential first, then essential
        availableLimits.sort((a, b) => {
            const aIsNonEssential = NON_ESSENTIAL_ORDER.includes(a.category);
            const bIsNonEssential = NON_ESSENTIAL_ORDER.includes(b.category);

            if (aIsNonEssential && !bIsNonEssential) return -1;
            if (!aIsNonEssential && bIsNonEssential) return 1;

            // Within non-essential, sort by priority order
            if (aIsNonEssential && bIsNonEssential) {
                return NON_ESSENTIAL_ORDER.indexOf(a.category) - NON_ESSENTIAL_ORDER.indexOf(b.category);
            }

            // Within essential, sort by reverse priority (reduce least essential first)
            if (!aIsNonEssential && !bIsNonEssential) {
                const aIdx = ESSENTIAL_CATEGORIES.indexOf(a.category);
                const bIdx = ESSENTIAL_CATEGORIES.indexOf(b.category);
                // Categories not in either list go after non-essential
                if (aIdx === -1 && bIdx === -1) return 0;
                if (aIdx === -1) return -1;
                if (bIdx === -1) return 1;
                return bIdx - aIdx; // Reverse: reduce least essential first
            }

            return 0;
        });

        // Calculate suggested reductions
        let remainingToBalance = extraAmount;
        const suggestions = [];

        for (const limit of availableLimits) {
            if (remainingToBalance <= 0) break;

            const availableToReduce = limit.remainingAmount;
            if (availableToReduce <= 0) continue;

            const suggestedReduction = Math.min(availableToReduce, remainingToBalance);
            suggestions.push({
                category: limit.category,
                currentLimit: limit.monthlyLimit,
                currentSpent: limit.spentAmount,
                availableToReduce: availableToReduce,
                suggestedReduction: suggestedReduction,
                newLimit: limit.monthlyLimit - suggestedReduction
            });

            remainingToBalance -= suggestedReduction;
        }

        const canFullyBalance = remainingToBalance <= 0;

        res.json({
            overspentCategory,
            currentLimit: overspentLimit.monthlyLimit,
            currentSpent: overspentLimit.spentAmount,
            extraAmount,
            suggestions,
            canFullyBalance,
            shortfall: canFullyBalance ? 0 : remainingToBalance
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ====== NEW: Apply Budget Balance ======
const applyBalance = async (req, res) => {
    try {
        const { overspentCategory, adjustments } = req.body;

        if (!overspentCategory) {
            return res.status(400).json({ message: 'Overspent category is required' });
        }
        if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
            return res.status(400).json({ message: 'Adjustments are required' });
        }

        const now = new Date();
        const month = parseInt(req.body.month) || (now.getMonth() + 1);
        const year = parseInt(req.body.year) || now.getFullYear();

        // Get the overspent category limit
        const overspentLimit = await SpendingLimit.findOne({
            userId: req.user._id, category: overspentCategory, month, year
        });

        if (!overspentLimit) {
            return res.status(404).json({ message: 'Spending limit not found for overspent category' });
        }

        const extraAmount = overspentLimit.spentAmount - overspentLimit.monthlyLimit;
        if (extraAmount <= 0) {
            return res.status(400).json({ message: 'This category has not exceeded its limit' });
        }

        // Validate each adjustment
        let totalReduction = 0;
        const adjustmentDocs = [];

        for (const adj of adjustments) {
            if (!adj.category || !adj.reductionAmount || adj.reductionAmount <= 0) {
                return res.status(400).json({ message: `Invalid adjustment for category: ${adj.category || 'unknown'}` });
            }

            const targetLimit = await SpendingLimit.findOne({
                userId: req.user._id, category: adj.category, month, year
            });

            if (!targetLimit) {
                return res.status(404).json({ message: `Spending limit not found for ${adj.category}` });
            }

            if (targetLimit.userId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Unauthorized access to spending limit' });
            }

            const newLimit = targetLimit.monthlyLimit - adj.reductionAmount;
            if (newLimit < 0) {
                return res.status(400).json({ message: `Cannot reduce ${adj.category} below ₹0` });
            }

            totalReduction += adj.reductionAmount;
            adjustmentDocs.push({ targetLimit, reductionAmount: adj.reductionAmount });
        }

        // Apply adjustments
        const reducedCategories = [];

        for (const { targetLimit, reductionAmount } of adjustmentDocs) {
            targetLimit.monthlyLimit -= reductionAmount;
            targetLimit.remainingAmount = Math.max(0, targetLimit.monthlyLimit - targetLimit.spentAmount);
            targetLimit.usagePercentage = targetLimit.monthlyLimit > 0
                ? Math.round((targetLimit.spentAmount / targetLimit.monthlyLimit) * 100)
                : 0;

            // Add adjustment record
            targetLimit.adjustments = targetLimit.adjustments || [];
            targetLimit.adjustments.push({
                type: 'decrease',
                amount: reductionAmount,
                reason: `Budget balanced: reduced to cover ${overspentCategory} overspending`,
                relatedCategory: overspentCategory,
                date: new Date()
            });

            await targetLimit.save();
            reducedCategories.push(targetLimit.category);
        }

        // Increase the overspent category limit to cover the extra spending
        overspentLimit.monthlyLimit += totalReduction;
        overspentLimit.remainingAmount = Math.max(0, overspentLimit.monthlyLimit - overspentLimit.spentAmount);
        overspentLimit.usagePercentage = overspentLimit.monthlyLimit > 0
            ? Math.round((overspentLimit.spentAmount / overspentLimit.monthlyLimit) * 100)
            : 0;

        // Add adjustment record
        overspentLimit.adjustments = overspentLimit.adjustments || [];
        overspentLimit.adjustments.push({
            type: 'increase',
            amount: totalReduction,
            reason: `Budget balanced: increased limit using ${reducedCategories.join(', ')} budgets`,
            relatedCategory: reducedCategories.join(', '),
            date: new Date()
        });

        await overspentLimit.save();

        // Create notification
        const notifMessage = `${overspentCategory} overspending of ₹${extraAmount.toLocaleString()} was balanced using ${reducedCategories.join(' and ')} budgets.`;
        const dedupKey = `balance-${overspentCategory}-${month}-${year}-${Date.now()}`;

        await Notification.create({
            userId: req.user._id,
            title: 'Budget Balanced',
            message: notifMessage,
            type: 'Budget',
            priority: 'Medium',
            dedupKey
        });

        // Return updated limits
        const updatedLimits = await SpendingLimit.find({ userId: req.user._id, month, year }).sort({ category: 1 });
        res.json({
            message: 'Budget balanced successfully',
            limits: updatedLimits
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createSpendingLimit, getSpendingLimits, getSpendingLimitSummary,
    updateSpendingLimit, deleteSpendingLimit, recalculateSpendingLimits,
    getBalanceSuggestions, applyBalance
};
