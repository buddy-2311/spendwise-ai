const mongoose = require('mongoose');

const compulsorySavingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    targetAmount: { type: Number, required: true, min: 0 },
    savedAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
}, { timestamps: true });

compulsorySavingSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('CompulsorySaving', compulsorySavingSchema);
