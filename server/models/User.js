const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    monthlyIncome: { type: Number, default: 0 },
    currentAge: { type: Number },
    preferredCurrency: { type: String, default: '₹' },
    savingsPreference: { type: String, default: 'Moderate' },
    riskLevel: { type: String, enum: ['Conservative', 'Balanced', 'Aggressive'], default: 'Balanced' },
    defaultMonthlySavingPercentage: { type: Number, default: 20 },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date }
}, { timestamps: true });

// Safely fallback old themes to 'light' before validation
userSchema.pre('validate', function(next) {
    if (this.theme && !['light', 'dark'].includes(this.theme)) {
        this.theme = 'light';
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
