const NetWorthItem = require('../models/NetWorthItem');

const createNetWorthItem = async (req, res) => {
    try {
        const { type, category, name, amount, note, date } = req.body;
        if (!type || !category || !name || !amount || amount <= 0) {
            return res.status(400).json({ message: 'Type, category, name and valid amount are required' });
        }
        if (!['Asset', 'Liability'].includes(type)) {
            return res.status(400).json({ message: 'Type must be Asset or Liability' });
        }
        const item = new NetWorthItem({
            userId: req.user._id, type, category, name, amount, note, date
        });
        const created = await item.save();
        res.status(201).json(created);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getNetWorthItems = async (req, res) => {
    try {
        const filter = { userId: req.user._id };
        if (req.query.type) filter.type = req.query.type;
        if (req.query.category) filter.category = req.query.category;
        const items = await NetWorthItem.find(filter).sort({ date: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getNetWorthSummary = async (req, res) => {
    try {
        const items = await NetWorthItem.find({ userId: req.user._id });
        const assets = items.filter(i => i.type === 'Asset');
        const liabilities = items.filter(i => i.type === 'Liability');
        const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
        const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);
        const netWorth = totalAssets - totalLiabilities;

        // Asset breakdown
        const assetBreakdown = {};
        assets.forEach(a => {
            assetBreakdown[a.category] = (assetBreakdown[a.category] || 0) + a.amount;
        });
        // Liability breakdown
        const liabilityBreakdown = {};
        liabilities.forEach(l => {
            liabilityBreakdown[l.category] = (liabilityBreakdown[l.category] || 0) + l.amount;
        });

        let status = 'Positive';
        if (netWorth < 0) status = 'Negative';
        else if (netWorth === 0) status = 'Neutral';

        // AI Insights
        const insights = [];
        if (netWorth > 0) {
            insights.push('Your net worth is positive. Good financial position.');
        } else if (netWorth < 0) {
            insights.push('Your net worth is negative. Focus on reducing debt.');
        }
        if (totalLiabilities > totalAssets * 0.5) {
            insights.push('Your liabilities are high compared to assets. Work on debt reduction.');
        }
        const investmentAssets = assets.filter(a => a.category === 'Investments').reduce((s, a) => s + a.amount, 0);
        if (totalAssets > 0 && investmentAssets / totalAssets < 0.2) {
            insights.push('Your investment assets are low. Consider increasing investments gradually.');
        }
        if (totalLiabilities > 0) {
            insights.push('Reducing debt will improve your net worth faster.');
        }

        res.json({
            totalAssets, totalLiabilities, netWorth, status,
            assetBreakdown, liabilityBreakdown, insights,
            assetCount: assets.length, liabilityCount: liabilities.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getNetWorthHistory = async (req, res) => {
    try {
        const items = await NetWorthItem.find({ userId: req.user._id }).sort({ date: 1 });
        // Group by month
        const monthMap = {};
        items.forEach(item => {
            const d = new Date(item.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthMap[key]) monthMap[key] = { assets: 0, liabilities: 0 };
            if (item.type === 'Asset') monthMap[key].assets += item.amount;
            else monthMap[key].liabilities += item.amount;
        });

        // Cumulative calculation
        let cumulativeAssets = 0;
        let cumulativeLiabilities = 0;
        const history = Object.entries(monthMap).sort().map(([key, val]) => {
            cumulativeAssets += val.assets;
            cumulativeLiabilities += val.liabilities;
            return {
                month: key,
                assets: cumulativeAssets,
                liabilities: cumulativeLiabilities,
                netWorth: cumulativeAssets - cumulativeLiabilities
            };
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateNetWorthItem = async (req, res) => {
    try {
        const item = await NetWorthItem.findById(req.params.id);
        if (!item || item.userId.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Item not found' });
        }
        Object.assign(item, req.body);
        const updated = await item.save();
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteNetWorthItem = async (req, res) => {
    try {
        const item = await NetWorthItem.findById(req.params.id);
        if (!item || item.userId.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Item not found' });
        }
        await item.deleteOne();
        res.json({ message: 'Item removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createNetWorthItem, getNetWorthItems, getNetWorthSummary,
    getNetWorthHistory, updateNetWorthItem, deleteNetWorthItem
};
