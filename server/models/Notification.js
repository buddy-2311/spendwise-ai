const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['Budget', 'Subscription', 'Goal', 'Expense', 'Prediction', 'System'], default: 'System' },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    isRead: { type: Boolean, default: false },
    actionLink: { type: String, default: '' },
    dedupKey: { type: String, default: '' }
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, dedupKey: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
