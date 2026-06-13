import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Calculator, Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';

const SavingsCalculator = () => {
    const { user } = useContext(AuthContext);
    const [loadingData, setLoadingData] = useState(true);
    const [goalName, setGoalName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [currentSaved, setCurrentSaved] = useState('');
    const [deadline, setDeadline] = useState('');
    const [result, setResult] = useState(null);

    // Auto-filled data
    const [autoData, setAutoData] = useState({
        monthlyIncome: 0,
        monthlyExpenses: 0,
        subscriptionsCost: 0,
        recurringExpensesCost: 0,
        compulsorySaving: 0,
        expenseCategories: {}
    });

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

                const [incRes, expRes, subSumRes, recExpRes, compSavRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/income', config),
                    axios.get('http://localhost:5000/api/expenses', config),
                    axios.get('http://localhost:5000/api/subscriptions/summary', config),
                    axios.get('http://localhost:5000/api/recurring-expenses', config),
                    axios.get(`http://localhost:5000/api/compulsory-savings?month=${currentMonth}&year=${currentYear}`, config)
                ]);

                const income = incRes.data;
                const expenses = expRes.data;
                const subSummary = subSumRes.data;
                const recExpenses = recExpRes.data;
                const compSavings = compSavRes.data;

                const totalIncome = income.reduce((s, i) => s + i.amount, 0) || user?.monthlyIncome || 0;
                const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
                const subCost = subSummary?.monthlyCost || 0;
                const recCost = recExpenses.filter(r => r.status === 'Active').reduce((s, r) => s + (r.amount || 0), 0);
                const compSavingTarget = compSavings?.targetAmount || 0;

                // Category-wise expenses for suggestions
                const catMap = {};
                expenses.forEach(e => {
                    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
                });

                setAutoData({
                    monthlyIncome: totalIncome,
                    monthlyExpenses: totalExpenses,
                    subscriptionsCost: subCost,
                    recurringExpensesCost: recCost,
                    compulsorySaving: compSavingTarget,
                    expenseCategories: catMap
                });
            } catch (err) {
                console.error('Failed to load user data', err);
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, [user.token, currentMonth, currentYear]);

    const totalFixedExpenses = autoData.subscriptionsCost + autoData.recurringExpensesCost + autoData.compulsorySaving;
    const availableIncome = autoData.monthlyIncome - autoData.monthlyExpenses - totalFixedExpenses;

    const handleCalculate = (e) => {
        e.preventDefault();

        const target = Number(targetAmount);
        const saved = Number(currentSaved) || 0;
        const needed = target - saved;
        const available = Math.max(0, availableIncome);
        const shortfall = needed - available;

        let resultObj = {
            target,
            saved,
            needed,
            income: autoData.monthlyIncome,
            totalExpenses: autoData.monthlyExpenses + totalFixedExpenses,
            fixedExpenses: totalFixedExpenses,
            subscriptions: autoData.subscriptionsCost,
            recurringExpenses: autoData.recurringExpensesCost,
            compulsorySaving: autoData.compulsorySaving,
            availableAfterExpenses: available,
            shortfall: Math.max(0, shortfall),
            isPossible: available >= needed,
            suggestions: []
        };

        if (saved >= target) {
            resultObj.message = "Congratulations! You have already achieved this goal.";
            resultObj.progress = 100;
            resultObj.isAlreadyAchieved = true;
            setResult(resultObj);
            return;
        }

        if (autoData.monthlyIncome <= 0) {
            setResult({ ...resultObj, message: "No income data found. Please add income first.", error: true });
            return;
        }

        if (resultObj.isPossible) {
            resultObj.message = `This goal is possible this month! You need ₹${needed.toLocaleString()} and have ₹${available.toLocaleString()} available after all expenses, subscriptions, recurring expenses, and compulsory savings.`;
            resultObj.progress = Math.min(100, Math.round((saved / target) * 100));
        } else {
            resultObj.message = `This goal is not possible this month with your current income and expenses.`;
            resultObj.progress = Math.min(100, Math.round((saved / target) * 100));

            const catEntries = Object.entries(autoData.expenseCategories)
                .map(([cat, val]) => ({ cat, val }))
                .filter(c => c.val > 0)
                .sort((a, b) => b.val - a.val);

            let remainingReduction = resultObj.shortfall;
            catEntries.forEach(({ cat, val }) => {
                if (remainingReduction <= 0) return;
                const reduction = Math.min(val * 0.5, remainingReduction);
                if (reduction >= 500) {
                    resultObj.suggestions.push(`Reduce ${cat} spending by ₹${Math.round(reduction).toLocaleString()}`);
                    remainingReduction -= reduction;
                }
            });

            if (remainingReduction > 0 && totalFixedExpenses > 0) {
                resultObj.suggestions.push(`Also consider reducing subscriptions or recurring expenses by ₹${Math.round(remainingReduction).toLocaleString()}`);
            }
        }

        setResult(resultObj);
    };

    if (loadingData) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800">Monthly Goal Calculator</h1>

            {/* Auto-filled Summary from your data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-4">
                    <p className="text-xs text-gray-500">Total Monthly Income</p>
                    <p className="text-xl font-bold text-success">₹{autoData.monthlyIncome.toLocaleString()}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-xs text-gray-500">Total Monthly Expenses</p>
                    <p className="text-xl font-bold text-danger">₹{(autoData.monthlyExpenses + totalFixedExpenses).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">Expenses: ₹{autoData.monthlyExpenses.toLocaleString()} + Subs: ₹{autoData.subscriptionsCost.toLocaleString()} + Recurring: ₹{autoData.recurringExpensesCost.toLocaleString()} + Saving: ₹{autoData.compulsorySaving.toLocaleString()}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-xs text-gray-500">Available After All Expenses</p>
                    <p className={`text-xl font-bold ${availableIncome >= 0 ? 'text-success' : 'text-danger'}`}>₹{Math.max(0, availableIncome).toLocaleString()}</p>
                </div>
            </div>

            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold flex items-center mb-4"><Calculator size={20} className="mr-2 text-primary" /> Goal Details</h3>
                <form onSubmit={handleCalculate}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Goal Name</label>
                            <input type="text" required className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="e.g. New Laptop" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Target Amount (₹)</label>
                            <input type="number" required min="1" className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="e.g. 20000" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Current Saved Amount (₹)</label>
                            <input type="number" min="0" className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none" value={currentSaved} onChange={e => setCurrentSaved(e.target.value)} placeholder="e.g. 5000" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Target Month / Deadline</label>
                            <input type="month" className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none" value={deadline} onChange={e => setDeadline(e.target.value)} />
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 mb-4">
                        * Income, expenses, subscriptions, recurring expenses, and compulsory savings auto-filled from your account.
                    </p>

                    <button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary text-white py-2.5 rounded-lg hover:opacity-90 transition font-medium">
                        Calculate Goal Feasibility
                    </button>
                </form>
            </div>

            {result && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4">Result</h3>
                    
                    {result.isAlreadyAchieved ? (
                        <div className="flex items-center space-x-3 p-4 bg-success/10 rounded-lg border border-success/20">
                            <CheckCircle size={24} className="text-success" />
                            <div>
                                <p className="font-semibold text-success">Goal Already Achieved!</p>
                                <p className="text-sm text-gray-600">You've already saved enough for this goal.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {result.progress !== undefined && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-500">Progress</span>
                                        <span className="font-medium">{result.progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div className="bg-primary h-3 rounded-full" style={{ width: `${result.progress}%` }} />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div className="bg-white p-3 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase">Need to Save</p>
                                    <p className="font-bold text-lg text-gray-800">₹{result.needed.toLocaleString()}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase">Total Income</p>
                                    <p className="font-bold text-lg text-success">₹{result.income.toLocaleString()}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase">Total Expenses</p>
                                    <p className="font-bold text-lg text-danger">₹{result.totalExpenses.toLocaleString()}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase">Available After All</p>
                                    <p className={`font-bold text-lg ${result.availableAfterExpenses > 0 ? 'text-success' : 'text-danger'}`}>₹{result.availableAfterExpenses.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Fixed expenses breakdown */}
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                <div className="bg-gray-50 rounded-lg p-2 text-center">
                                    <p className="text-[10px] text-gray-500">Subscriptions</p>
                                    <p className="text-xs font-semibold">₹{result.subscriptions.toLocaleString()}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 text-center">
                                    <p className="text-[10px] text-gray-500">Recurring</p>
                                    <p className="text-xs font-semibold">₹{result.recurringExpenses.toLocaleString()}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 text-center">
                                    <p className="text-[10px] text-gray-500">Comp. Saving</p>
                                    <p className="text-xs font-semibold">₹{result.compulsorySaving.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className={`p-4 rounded-lg mb-4 ${result.isPossible ? 'bg-success/10 border border-success/20' : 'bg-danger/10 border border-danger/20'}`}>
                                <div className="flex items-start space-x-3">
                                    {result.isPossible ? (
                                        <CheckCircle size={20} className="text-success mt-0.5" />
                                    ) : (
                                        <AlertTriangle size={20} className="text-danger mt-0.5" />
                                    )}
                                    <div>
                                        <p className={`font-semibold ${result.isPossible ? 'text-success' : 'text-danger'}`}>
                                            {result.isPossible ? 'This goal is possible this month!' : 'This goal is not possible this month'}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                                        {result.shortfall > 0 && (
                                            <p className="text-sm font-medium text-danger mt-1">Shortfall: ₹{result.shortfall.toLocaleString()}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {result.suggestions.length > 0 && (
                                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Lightbulb size={18} className="text-primary" />
                                        <p className="font-semibold text-sm text-primary">Suggestions - Where to Reduce Spending</p>
                                    </div>
                                    <ul className="space-y-1">
                                        {result.suggestions.map((s, i) => (
                                            <li key={i} className="text-sm text-gray-700 flex items-start space-x-2">
                                                <span className="text-primary mt-0.5">•</span>
                                                <span>{s}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SavingsCalculator;