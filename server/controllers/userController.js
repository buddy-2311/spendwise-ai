const User = require('../models/User');
const bcrypt = require('bcrypt');

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateProfile = async (req, res) => {
    const { name, email, monthlyIncome } = req.body;
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.name = name || user.name;
            user.email = email || user.email;
            user.monthlyIncome = monthlyIncome !== undefined ? monthlyIncome : user.monthlyIncome;
            
            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                monthlyIncome: updatedUser.monthlyIncome,
                currentAge: updatedUser.currentAge,
                preferredCurrency: updatedUser.preferredCurrency,
                riskLevel: updatedUser.riskLevel,
                theme: updatedUser.theme
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updatePreferences = async (req, res) => {
    const { monthlyIncome, currentAge, preferredCurrency, riskLevel, theme } = req.body;
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.monthlyIncome = monthlyIncome !== undefined ? monthlyIncome : user.monthlyIncome;
            user.currentAge = currentAge !== undefined ? currentAge : user.currentAge;
            user.preferredCurrency = preferredCurrency || user.preferredCurrency;
            user.riskLevel = riskLevel || user.riskLevel;
            if (theme) {
                if (!['light', 'dark'].includes(theme)) {
                    return res.status(400).json({ message: 'Invalid theme selected.' });
                }
                user.theme = theme;
            }
            
            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                monthlyIncome: updatedUser.monthlyIncome,
                currentAge: updatedUser.currentAge,
                preferredCurrency: updatedUser.preferredCurrency,
                riskLevel: updatedUser.riskLevel,
                theme: updatedUser.theme
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTheme = async (req, res) => {
    const { theme } = req.body;
    try {
        if (!theme || !['light', 'dark'].includes(theme)) {
            return res.status(400).json({ message: 'Invalid theme selected.' });
        }

        const user = await User.findById(req.user._id);
        if (user) {
            user.theme = theme;
            
            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                theme: updatedUser.theme
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await User.findById(req.user._id);
        if (user && (await bcrypt.compare(currentPassword, user.password))) {
            if (newPassword.length < 6) {
                return res.status(400).json({ message: 'New password must be at least 6 characters' });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            await user.save();
            res.json({ message: 'Password updated successfully' });
        } else {
            res.status(401).json({ message: 'Invalid current password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    updatePreferences,
    updateTheme,
    changePassword
};
