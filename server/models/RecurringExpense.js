const mongoose = require('mongoose');

const recurringExpenseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    startDate: { type: Date, required: true },
    dueDay: { type: Number, required: true },
    endDate: { type: Date },
    recurrenceType: { type: String, enum: ['Monthly', 'Yearly', 'Custom'], default: 'Monthly' },
    durationMonths: { type: Number, default: null },
    note: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Paused'], default: 'Active' },
    lastGeneratedMonth: { type: Number },
    lastGeneratedYear: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('RecurringExpense', recurringExpenseSchema);
