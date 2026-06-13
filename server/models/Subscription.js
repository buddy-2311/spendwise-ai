const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    billingCycle: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly', 'Custom'], required: true },
    durationMonths: { type: Number, default: null },
    startDate: { type: Date, required: true },
    renewalDate: { type: Date, required: true },
    paymentMethod: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Paused', 'Cancelled'], default: 'Active' },
    notes: { type: String, default: '' },
    autoAddToExpense: { type: Boolean, default: false },
    lastExpenseGeneratedMonth: { type: Number },
    lastExpenseGeneratedYear: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
