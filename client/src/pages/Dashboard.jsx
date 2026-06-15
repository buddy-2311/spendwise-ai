import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    CreditCard,
    Landmark,
    Shield,
    PiggyBank,
    CheckCircle,
    Clock,
    Edit3,
    Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getCurrentSaving, setTarget, addSavedAmount } from '../services/compulsorySavingService';

const COLORS = ['#4F46E5', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#EC4899'];

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    const [expenses, setExpenses] = useState([]);
    const [income, setIncome] = useState([]);
    const [predictions, setPredictions] = useState(null);
    const [subSummary, setSubSummary] = useState(null);
    const [nwSummary, setNwSummary] = useState(null);
    const [limitSummary, setLimitSummary] = useState(null);
    const [futureGoalsSaved, setFutureGoalsSaved] = useState(0);

    const [compulsorySaving, setCompulsorySaving] = useState({
        targetAmount: 0,
        savedAmount: 0,
        remaining: 0,
        status: 'Pending'
    });

    const [showSavingModal, setShowSavingModal] = useState(false);
    const [savingTargetInput, setSavingTargetInput] = useState('');
    const [savingAddInput, setSavingAddInput] = useState('');
    const [savingMode, setSavingMode] = useState('target');

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const API_BASE = import.meta.env.VITE_API_URL || 'https://spendwise-ai-fwmp.onrender.com/api';

    const getActualSavedAmount = (saving) => {
        return Number(
            saving?.savedAmount ??
            saving?.currentSaved ??
            saving?.currentAmount ??
            saving?.savedBalance ??
            saving?.amountSaved ??
            saving?.actualSaved ??
            saving?.balance ??
            0
        );
    };

    const getFutureGoalSavedAmount = (goal) => {
        return Number(
            goal?.currentAmount ??
            goal?.savedAmount ??
            goal?.currentSaved ??
            goal?.saved ??
            goal?.amountSaved ??
            goal?.actualSaved ??
            0
        );
    };

    const fetchCompulsorySaving = useCallback(async () => {
        try {
            const { data } = await getCurrentSaving(user.token, currentMonth, currentYear);
            const actualSaved = getActualSavedAmount(data);
            const target = Number(data?.targetAmount || 0);

            setCompulsorySaving({
                targetAmount: target,
                savedAmount: actualSaved,
                remaining: Number(data?.remaining || Math.max(0, target - actualSaved)),
                status: data?.status || (actualSaved >= target ? 'Completed' : 'Pending')
            });
        } catch (error) {
            console.error('Failed to fetch compulsory saving', error);
        }
    }, [user.token, currentMonth, currentYear]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${user.token}`
                    }
                };

                const [expRes, incRes] = await Promise.all([
                    axios.get(`${API_BASE}/expenses`, config),
                    axios.get(`${API_BASE}/income`, config)
                ]);

                setExpenses(expRes.data || []);
                setIncome(incRes.data || []);

                try {
                    const r = await axios.get(`${API_BASE}/predictions/next-month`, config);
                    setPredictions(r.data);
                } catch {}

                try {
                    const r = await axios.get(`${API_BASE}/subscriptions/summary`, config);
                    setSubSummary(r.data);
                } catch {}

                try {
                    const r = await axios.get(`${API_BASE}/net-worth/summary`, config);
                    setNwSummary(r.data);
                } catch {}

                try {
                    const r = await axios.get(`${API_BASE}/spending-limits/summary?month=${currentMonth}&year=${currentYear}`, config);
                    setLimitSummary(r.data);
                } catch {}

                try {
                    const r = await axios.get(`${API_BASE}/goals`, config);
                    const goals = r.data || [];

                    const totalFutureSaved = goals.reduce((sum, goal) => {
                        return sum + getFutureGoalSavedAmount(goal);
                    }, 0);

                    setFutureGoalsSaved(totalFutureSaved);
                } catch (error) {
                    console.error('Failed to fetch future planner goals', error);
                    setFutureGoalsSaved(0);
                }

                await fetchCompulsorySaving();
            } catch (error) {
                console.error('Error fetching dashboard data', error);
            }
        };

        if (user?.token) {
            fetchData();
        }
    }, [user?.token, currentMonth, currentYear, fetchCompulsorySaving, API_BASE]);

    const totalIncome = income.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const totalExpense = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const balanceBeforeSaving = totalIncome - totalExpense;
    const monthlySavedMoney = Number(compulsorySaving.savedAmount || 0);
    const savedMoneyThisMonth = monthlySavedMoney + futureGoalsSaved;

    const totalAmountLeft = balanceBeforeSaving - savedMoneyThisMonth;

    const categoryData = expenses.reduce((acc, curr) => {
        const category = curr.category || 'Other';
        const amount = Number(curr.amount || 0);

        const found = acc.find(item => item.name === category);

        if (found) {
            found.value += amount;
        } else {
            acc.push({ name: category, value: amount });
        }

        return acc;
    }, []);

    const handleSetSavingTarget = async () => {
        if (!savingTargetInput || Number(savingTargetInput) <= 0) {
            toast.error('Enter a valid target amount');
            return;
        }

        try {
            await setTarget(user.token, {
                targetAmount: Number(savingTargetInput),
                month: currentMonth,
                year: currentYear
            });

            toast.success('Monthly saving target updated!');
            setShowSavingModal(false);
            setSavingTargetInput('');
            await fetchCompulsorySaving();
        } catch (err) {
            toast.error('Failed to update target');
        }
    };

    const handleAddSavedBalance = async () => {
        if (!savingAddInput || Number(savingAddInput) <= 0) {
            toast.error('Enter a valid amount');
            return;
        }

        try {
            await addSavedAmount(user.token, {
                savedAmount: Number(savingAddInput),
                month: currentMonth,
                year: currentYear
            });

            toast.success('Saved balance added!');
            setShowSavingModal(false);
            setSavingAddInput('');
            await fetchCompulsorySaving();
        } catch (err) {
            toast.error('Failed to add saved balance');
        }
    };

    const openSavingModal = (mode) => {
        setSavingMode(mode);
        setSavingTargetInput(compulsorySaving.targetAmount?.toString() || '');
        setSavingAddInput('');
        setShowSavingModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

                <div className="glass-card px-4 py-2 sm:px-5 sm:py-3 flex items-center space-x-3 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 w-full sm:w-auto">
                    <DollarSign size={20} className="text-primary" />
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Total Amount Left</p>
                        <p className={`text-lg sm:text-xl font-bold ${totalAmountLeft >= 0 ? 'text-success' : 'text-danger'}`}>
                            ₹{totalAmountLeft.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-400">
                            Balance after deducting monthly saved + Future Planner saved
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="glass-card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Balance Before Saving</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">
                            ₹{balanceBeforeSaving.toLocaleString()}
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-1">
                            Income minus expenses
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <DollarSign size={24} />
                    </div>
                </div>

                <div className="glass-card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Saved Money</p>
                        <h3 className="text-2xl font-bold text-success mt-1">
                            ₹{savedMoneyThisMonth.toLocaleString()}
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-1">
                            Monthly: ₹{monthlySavedMoney.toLocaleString()} + Future: ₹{futureGoalsSaved.toLocaleString()}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success">
                        <PiggyBank size={24} />
                    </div>
                </div>

                <div className="glass-card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Income</p>
                        <h3 className="text-2xl font-bold text-success mt-1">
                            ₹{totalIncome.toLocaleString()}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success">
                        <TrendingUp size={24} />
                    </div>
                </div>

                <div className="glass-card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Expenses</p>
                        <h3 className="text-2xl font-bold text-danger mt-1">
                            ₹{totalExpense.toLocaleString()}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger">
                        <TrendingDown size={24} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
                    <div className="flex items-center space-x-2 mb-1">
                        <TrendingUp size={16} className="text-secondary" />
                        <span className="text-xs font-medium text-gray-500">Next Month</span>
                    </div>
                    <p className="text-lg font-bold">
                        ₹{(predictions?.predictedExpense || 0).toLocaleString()}
                    </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
                    <div className="flex items-center space-x-2 mb-1">
                        <CreditCard size={16} className="text-primary" />
                        <span className="text-xs font-medium text-gray-500">Subscriptions</span>
                    </div>
                    <p className="text-lg font-bold">
                        ₹{(subSummary?.monthlyCost || 0).toLocaleString()}
                        <span className="text-xs text-gray-400">/mo</span>
                    </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
                    <div className="flex items-center space-x-2 mb-1">
                        <Landmark size={16} className="text-success" />
                        <span className="text-xs font-medium text-gray-500">Net Worth</span>
                    </div>
                    <p className={`text-lg font-bold ${(nwSummary?.netWorth || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                        ₹{(nwSummary?.netWorth || 0).toLocaleString()}
                    </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
                    <div className="flex items-center space-x-2 mb-1">
                        <Shield size={16} className="text-danger" />
                        <span className="text-xs font-medium text-gray-500">Limits Exceeded</span>
                    </div>
                    <p className="text-lg font-bold text-danger">
                        {limitSummary?.exceededCount || 0}
                    </p>
                </motion.div>
            </div>

            <div className="glass-card p-5 md:p-6 bg-gradient-to-br from-secondary/5 to-primary/5 border-secondary/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <div className="flex items-center space-x-2">
                        <PiggyBank size={20} className="text-secondary" />
                        <h3 className="text-lg font-semibold text-gray-800">Compulsory Monthly Savings</h3>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => openSavingModal('add')}
                            className="flex items-center space-x-1 text-sm text-success hover:text-success/80 font-medium"
                        >
                            <Plus size={14} />
                            <span>Add Saved</span>
                        </button>

                        <button
                            onClick={() => openSavingModal('target')}
                            className="flex items-center space-x-1 text-sm text-primary hover:text-primary/80 font-medium"
                        >
                            <Edit3 size={14} />
                            <span>Update Target</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                    <div className="bg-white/60 rounded-xl p-3 md:p-4">
                        <p className="text-xs text-gray-500">Month</p>
                        <p className="font-semibold text-gray-800">
                            {now.toLocaleString('default', { month: 'long' })} {currentYear}
                        </p>
                    </div>

                    <div className="bg-white/60 rounded-xl p-3 md:p-4">
                        <p className="text-xs text-gray-500">Target</p>
                        <p className="font-semibold text-gray-800">
                            ₹{(compulsorySaving.targetAmount || 0).toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-white/60 rounded-xl p-3 md:p-4">
                        <p className="text-xs text-gray-500">Saved This Month</p>
                        <p className="font-semibold text-success">
                            ₹{monthlySavedMoney.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-400">
                            Only monthly compulsory saving
                        </p>
                    </div>

                    <div className="bg-white/60 rounded-xl p-3 md:p-4">
                        <p className="text-xs text-gray-500">Remaining</p>
                        <p className="font-semibold text-danger">
                            ₹{(compulsorySaving.remaining || 0).toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-white/60 rounded-xl p-3 md:p-4 flex items-center space-x-2">
                        {compulsorySaving.status === 'Completed' ? (
                            <>
                                <CheckCircle size={18} className="text-success" />
                                <span className="font-semibold text-success">Completed</span>
                            </>
                        ) : (
                            <>
                                <Clock size={18} className="text-warning" />
                                <span className="font-semibold text-warning">Pending</span>
                            </>
                        )}
                    </div>
                </div>

                {(compulsorySaving.targetAmount || 0) > 0 && (
                    <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="h-2.5 rounded-full bg-secondary transition-all duration-500"
                                style={{
                                    width: `${Math.min(100, (monthlySavedMoney / (compulsorySaving.targetAmount || 1)) * 100)}%`
                                }}
                            />
                        </div>

                        <p className="text-xs text-gray-500 mt-1 text-right">
                            {Math.min(100, Math.round((monthlySavedMoney / (compulsorySaving.targetAmount || 1)) * 100))}% monthly saving target completed
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>

                        <div className="h-72 overflow-x-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <RechartsTooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold mb-4">Category Split</h3>

                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showSavingModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
                        >
                            {savingMode === 'target' ? (
                                <>
                                    <h2 className="text-xl font-bold mb-4 text-gray-800">
                                        Update Monthly Saving Target
                                    </h2>

                                    <p className="text-sm text-gray-500 mb-4">
                                        Current target: ₹{(compulsorySaving.targetAmount || 0).toLocaleString()}
                                    </p>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            New Monthly Saving Target
                                        </label>

                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                            value={savingTargetInput}
                                            onChange={e => setSavingTargetInput(e.target.value)}
                                            placeholder="e.g. 10000"
                                        />
                                    </div>

                                    <div className="flex justify-end space-x-3 mt-6">
                                        <button
                                            onClick={() => setShowSavingModal(false)}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            onClick={handleSetSavingTarget}
                                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                        >
                                            Update Target
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-xl font-bold mb-4 text-gray-800">
                                        Add New Saved Balance
                                    </h2>

                                    <p className="text-sm text-gray-500 mb-4">
                                        Monthly saved: ₹{monthlySavedMoney.toLocaleString()}
                                    </p>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Amount to Add
                                        </label>

                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                            value={savingAddInput}
                                            onChange={e => setSavingAddInput(e.target.value)}
                                            placeholder="e.g. 2000"
                                        />
                                    </div>

                                    <div className="flex justify-end space-x-3 mt-6">
                                        <button
                                            onClick={() => setShowSavingModal(false)}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            onClick={handleAddSavedBalance}
                                            className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;