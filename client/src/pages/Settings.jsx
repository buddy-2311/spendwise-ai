import { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Check, Sun, Moon, KeyRound } from 'lucide-react';

const Settings = () => {
    const { user, updateUser } = useContext(AuthContext);

    // Profile State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [monthlyIncome, setMonthlyIncome] = useState(0);

    // Theme Options - Only Light and Dark
    const themes = [
        { id: 'light', name: 'Light Mode', icon: Sun, gradient: 'from-amber-400 to-orange-400', bg: 'bg-gradient-to-br from-gray-50 to-white', border: 'border-gray-200', preview: { bg: '#F8FAFC', card: '#FFFFFF', accent: '#4F46E5' } },
        { id: 'dark', name: 'Dark Mode', icon: Moon, gradient: 'from-indigo-500 to-purple-600', bg: 'bg-gradient-to-br from-gray-800 to-gray-900', border: 'border-gray-700', preview: { bg: '#0F172A', card: '#1E293B', accent: '#8B5CF6' } }
    ];

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Forgot Password State
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [resetToken, setResetToken] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [resetNewPassword, setResetNewPassword] = useState('');
    const [resetConfirmPassword, setResetConfirmPassword] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
            setMonthlyIncome(user.monthlyIncome || 0);
        }
    }, [user]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.put('http://localhost:5000/api/users/profile', { name, email, monthlyIncome }, config);
            updateUser(data);
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating profile');
        }
    };

    const handleThemeUpdate = async (themeId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.put('http://localhost:5000/api/users/theme', { theme: themeId }, config);
            updateUser(data);
            toast.success('Theme updated successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating theme');
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return toast.error('New password and confirm password do not match');
        }
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.put('http://localhost:5000/api/users/change-password', { currentPassword, newPassword }, config);
            toast.success('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error changing password');
        }
    };

    const handleSendResetLink = async () => {
        try {
            const { data } = await axios.post('http://localhost:5000/api/auth/forgot-password', { email: user.email });
            setResetToken(data.resetToken);
            setResetEmailSent(true);
            toast.success('Reset code sent!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error sending reset link');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (resetNewPassword !== resetConfirmPassword) {
            return toast.error('Passwords do not match');
        }
        setResettingPassword(true);
        try {
            await axios.post('http://localhost:5000/api/auth/reset-password', {
                token: resetCode,
                password: resetNewPassword
            });
            toast.success('Password reset successful!');
            setShowForgotPassword(false);
            setResetEmailSent(false);
            setResetToken('');
            setResetCode('');
            setResetNewPassword('');
            setResetConfirmPassword('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error resetting password');
        } finally {
            setResettingPassword(false);
        }
    };

    const currentTheme = user?.theme && ['light', 'dark'].includes(user.theme) ? user.theme : 'light';

    return (
        <div className="space-y-6 max-w-3xl">
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
            
            {/* Profile Information */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-semibold border-b pb-2 mb-4 text-gray-800">Profile Information</h2>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-gray-800" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-gray-800" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income ({user?.preferredCurrency || '₹'})</label>
                            <input type="number" min="0" value={monthlyIncome} onChange={(e) => setMonthlyIncome(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-gray-800" />
                        </div>
                    </div>
                    <div>
                        <button type="submit" className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-colors shadow-sm">Update Profile</button>
                    </div>
                </form>
            </div>

            {/* Theme Settings */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-semibold border-b pb-2 mb-4 text-gray-800">Theme Settings</h2>
                <p className="text-sm text-gray-500 mb-4">Choose your preferred appearance</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {themes.map(t => {
                        const Icon = t.icon;
                        const isSelected = currentTheme === t.id;
                        return (
                            <div 
                                key={t.id} 
                                onClick={() => handleThemeUpdate(t.id)}
                                className={`relative cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden group hover:shadow-xl ${
                                    isSelected 
                                        ? 'border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/20' 
                                        : 'border-gray-200 hover:border-primary/50'
                                }`}
                            >
                                {/* Theme Preview */}
                                <div className={`p-4 ${t.bg}`}>
                                    <div className="flex items-center space-x-3 mb-3">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center shadow-md`}>
                                            <Icon size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">{t.name}</h3>
                                            <p className="text-xs text-gray-500">{t.id === 'light' ? 'Clean & bright interface' : 'Easy on the eyes'}</p>
                                        </div>
                                    </div>

                                    {/* Mini Preview */}
                                    <div className="rounded-xl overflow-hidden border" style={{ borderColor: t.preview.accent + '30' }}>
                                        <div className="h-3" style={{ backgroundColor: t.preview.accent }}></div>
                                        <div className="p-2 space-y-1.5" style={{ backgroundColor: t.preview.bg }}>
                                            <div className="flex space-x-1.5">
                                                <div className="h-2 rounded-full flex-1" style={{ backgroundColor: t.preview.accent + '30' }}></div>
                                                <div className="h-2 rounded-full w-6" style={{ backgroundColor: t.preview.accent }}></div>
                                            </div>
                                            <div className="flex space-x-1.5">
                                                <div className="h-6 rounded" style={{ backgroundColor: t.preview.card, flex: 1, border: `1px solid ${t.preview.accent}15` }}></div>
                                                <div className="h-6 rounded" style={{ backgroundColor: t.preview.card, flex: 1, border: `1px solid ${t.preview.accent}15` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Selected indicator */}
                                {isSelected && (
                                    <div className="absolute top-3 right-3">
                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                                            <Check size={14} strokeWidth={3} className="text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Password Section */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-semibold border-b pb-2 mb-4 text-gray-800">Change Password</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-gray-800" />
                        </div>
                        <div className="hidden md:block"></div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-gray-800" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <input type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-gray-800" />
                        </div>
                    </div>
                    <div>
                        <button type="submit" className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-colors shadow-sm">Change Password</button>
                    </div>
                </form>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(!showForgotPassword)}
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                            <KeyRound size={14} />
                            Forgot your current password?
                        </button>

                        {showForgotPassword && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                {!resetEmailSent ? (
                                    <>
                                        <p className="text-sm text-gray-600 mb-3">
                                            A password reset link will be sent to your registered email.
                                        </p>
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={user?.email || ''}
                                                disabled
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-500 cursor-not-allowed"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSendResetLink}
                                            className="bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm"
                                        >
                                            Send Reset Link
                                        </button>
                                    </>
                                ) : (
                                    <form onSubmit={handleResetPassword} className="space-y-3">
                                        {resetToken && (
                                            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-sm">
                                                <p className="font-medium mb-1">Reset Code:</p>
                                                <code className="block bg-white px-2 py-1 rounded border border-blue-100 text-xs break-all select-all">
                                                    {resetToken}
                                                </code>
                                                <p className="text-xs mt-1 text-blue-600">
                                                    In production this would be sent via email.
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Enter Reset Code</label>
                                            <input
                                                type="text"
                                                required
                                                value={resetCode}
                                                onChange={(e) => setResetCode(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-gray-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                            <input
                                                type="password"
                                                required
                                                minLength={6}
                                                value={resetNewPassword}
                                                onChange={(e) => setResetNewPassword(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-gray-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                            <input
                                                type="password"
                                                required
                                                minLength={6}
                                                value={resetConfirmPassword}
                                                onChange={(e) => setResetConfirmPassword(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-gray-800"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={resettingPassword}
                                            className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                                        >
                                            {resettingPassword ? 'Resetting...' : 'Reset Password'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
            </div>
        </div>
    );
};

export default Settings;
