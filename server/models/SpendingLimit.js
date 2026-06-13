const mongoose = require('mongoose');

const spendingLimitSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    monthlyLimit: { type: Number, required: true, min: 0 },
    spentAmount: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, default: 0 },
    usagePercentage: { type: Number, default: 0 },
    alertAt70: { type: Boolean, default: true },
    alertAt90: { type: Boolean, default: true },
    alertAt100: { type: Boolean, default: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    adjustments: [{
        type: { type: String, enum: ['increase', 'decrease'] },
        amount: { type: Number },
        reason: { type: String },
        relatedCategory: { type: String },
        date: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

spendingLimitSchema.index({ userId: 1, category: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('SpendingLimit', spendingLimitSchema);
