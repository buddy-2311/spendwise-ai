const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    monthlyContribution: { type: Number, default: 0 },
    yearlyContribution: { type: Number, default: 0 },
    targetDate: { type: Date },
    targetYear: { type: Number },
    currentAge: { type: Number },
    targetAge: { type: Number },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    notes: { type: String },
    status: { type: String, enum: ['Active', 'Completed', 'Paused'], default: 'Active' },
    contributions: [{
        amount: Number,
        month: String,
        year: Number,
        date: Date
    }]
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
