const Subscription = require('../models/Subscription');
const Expense = require('../models/Expense');

const createSubscription = async (req, res) => {
    try {
        const { name, category, amount, billingCycle, durationMonths, startDate, renewalDate, paymentMethod, notes, autoAddToExpense } = req.body;
        if (!name || !category || !amount || !billingCycle || !startDate || !renewalDate) {
            return res.status(400).json({ message: 'Name, category, amount, billing cycle, start date and renewal date are required' });
        }
        if (billingCycle === 'Custom' && (!durationMonths || durationMonths < 1)) {
            return res.status(400).json({ message: 'Duration in months is required for Custom billing cycle' });
        }
        const sub = new Subscription({
            userId: req.user._id, name, category, amount, billingCycle, durationMonths: billingCycle === 'Custom' ? durationMonths : null,
            startDate, renewalDate, paymentMethod, notes, autoAddToExpense
        });
        const created = await sub.save();
        res.status(201).json(created);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSubscriptions = async (req, res) => {
    try {
        const subs = await Subscription.find({ userId: req.user._id }).sort({ renewalDate: 1 });
        res.json(subs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSubscriptionSummary = async (req, res) => {
    try {
        const subs = await Subscription.find({ userId: req.user._id });
        const active = subs.filter(s => s.status === 'Active');
        let monthlyCost = 0;
        active.forEach(s => {
            if (s.billingCycle === 'Monthly') monthlyCost += s.amount;
            else if (s.billingCycle === 'Quarterly') monthlyCost += s.amount / 3;
            else if (s.billingCycle === 'Yearly') monthlyCost += s.amount / 12;
            else if (s.billingCycle === 'Custom' && s.durationMonths) monthlyCost += s.amount / s.durationMonths;
        });
        const yearlyCost = monthlyCost * 12;
        const upcoming = active.filter(s => {
            const renewal = new Date(s.renewalDate);
            const now = new Date();
            const diff = (renewal - now) / (1000 * 60 * 60 * 24);
            return diff <= 7 && diff >= 0;
        });

        // Category breakdown
        const categoryBreakdown = {};
        active.forEach(s => {
            let monthly = s.amount;
            if (s.billingCycle === 'Quarterly') monthly = s.amount / 3;
            else if (s.billingCycle === 'Yearly') monthly = s.amount / 12;
            else if (s.billingCycle === 'Custom' && s.durationMonths) monthly = s.amount / s.durationMonths;
            categoryBreakdown[s.category] = (categoryBreakdown[s.category] || 0) + monthly;
        });

        res.json({
            activeCount: active.length, monthlyCost: Math.round(monthlyCost),
            yearlyCost: Math.round(yearlyCost), upcomingCount: upcoming.length,
            categoryBreakdown, totalSubscriptions: subs.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUpcomingRenewals = async (req, res) => {
    try {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const subs = await Subscription.find({
            userId: req.user._id, status: 'Active',
            renewalDate: { $gte: now, $lte: nextWeek }
        }).sort({ renewalDate: 1 });
        res.json(subs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateSubscription = async (req, res) => {
    try {
        const sub = await Subscription.findById(req.params.id);
        if (!sub || sub.userId.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Subscription not found' });
        }
        Object.assign(sub, req.body);
        const updated = await sub.save();
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteSubscription = async (req, res) => {
    try {
        const sub = await Subscription.findById(req.params.id);
        if (!sub || sub.userId.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Subscription not found' });
        }
        await sub.deleteOne();
        res.json({ message: 'Subscription removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateSubscriptionStatus = async (req, res) => {
    try {
        const sub = await Subscription.findById(req.params.id);
        if (!sub || sub.userId.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Subscription not found' });
        }
        const { status } = req.body;
        if (!['Active', 'Paused', 'Cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        sub.status = status;
        const updated = await sub.save();
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const generateRenewalExpenses = async (req, res) => {
    try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const activeSubs = await Subscription.find({
            userId: req.user._id, status: 'Active', autoAddToExpense: true
        });

        let generated = 0;
        for (const sub of activeSubs) {
            const renewalDate = new Date(sub.renewalDate);
            if (renewalDate > now) continue;
            if (sub.lastExpenseGeneratedMonth === currentMonth && sub.lastExpenseGeneratedYear === currentYear) continue;

            const expense = new Expense({
                userId: req.user._id,
                category: 'Subscriptions',
                amount: sub.amount,
                note: `${sub.name} - Auto subscription`,
                date: renewalDate,
                isRecurring: true,
                autoGenerated: true
            });
            await expense.save();

            // Advance renewal date
            const nextRenewal = new Date(renewalDate);
            if (sub.billingCycle === 'Monthly') nextRenewal.setMonth(nextRenewal.getMonth() + 1);
            else if (sub.billingCycle === 'Quarterly') nextRenewal.setMonth(nextRenewal.getMonth() + 3);
            else if (sub.billingCycle === 'Yearly') nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
            else if (sub.billingCycle === 'Custom' && sub.durationMonths) nextRenewal.setMonth(nextRenewal.getMonth() + sub.durationMonths);
            sub.renewalDate = nextRenewal;
            sub.lastExpenseGeneratedMonth = currentMonth;
            sub.lastExpenseGeneratedYear = currentYear;
            await sub.save();
            generated++;
        }
        res.json({ message: `Generated ${generated} subscription expenses`, count: generated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createSubscription, getSubscriptions, getSubscriptionSummary,
    getUpcomingRenewals, updateSubscription, deleteSubscription,
    updateSubscriptionStatus, generateRenewalExpenses
};
