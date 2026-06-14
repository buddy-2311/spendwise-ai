import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Calculator, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';

const SavingsCalculator = () => {
    const { user } = useContext(AuthContext);

    const [loadingData, setLoadingData] = useState(true);

    const [goals, setGoals] = useState([]);
    const [selectedGoalId, setSelectedGoalId] = useState('');

    const [goalName, setGoalName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [currentSaved, setCurrentSaved] = useState('');
    const [deadline, setDeadline] = useState('');

    const [result, setResult] = useState(null);

    const [autoData, setAutoData] = useState({
        monthlyIncome: 0,
        monthlyExpenses: 0,
        subscriptionsCost: 0,
        recurringExpensesCost: 0,
        expenseCategories: {}
    });

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const getGoalName = (goal) => {
        return goal?.title || goal?.name || '';
    };

    const getGoalTarget = (goal) => {
        return Number(goal?.targetAmount || goal?.target || 0);
    };

    const getGoalSaved = (goal) => {
        return Number(goal?.currentAmount || goal?.savedAmount || goal?.saved || 0);
    };

    const getGoalDeadline = (goal) => {
        return goal?.targetDate || goal?.deadline || goal?.dueDate || '';
    };

    const fillGoalData = (goal) => {
        if (!goal) return;

        setSelectedGoalId(goal._id || goal.id);
        setGoalName(getGoalName(goal));
        setTargetAmount(getGoalTarget(goal));
        setCurrentSaved(getGoalSaved(goal));

        const dateValue = getGoalDeadline(goal);
        if (dateValue) {
            setDeadline(new Date(dateValue).toISOString().slice(0, 7));
        } else {
            setDeadline('');
        }

        setResult(null);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${user.token}`
                    }
                };

                const [incomeRes, expenseRes, subRes, recurringRes, goalsRes] = await Promise.all([
                    axios.get(`${API_BASE}/income`, config),
                    axios.get(`${API_BASE}/expenses`, config),
                    axios.get(`${API_BASE}/subscriptions/summary`, config),
                    axios.get(`${API_BASE}/recurring-expenses`, config),
                    axios.get(`${API_BASE}/goals`, config)
                ]);

                const income = incomeRes.data || [];
                const expenses = expenseRes.data || [];
                const subscriptionSummary = subRes.data || {};
                const recurringExpenses = recurringRes.data || [];
                const futurePlannerGoals = goalsRes.data || [];

                setGoals(futurePlannerGoals);

                const totalIncome =
                    income.reduce((sum, item) => sum + Number(item.amount || 0), 0) ||
                    Number(user?.monthlyIncome || 0);

                const totalExpenses = expenses.reduce(
                    (sum, item) => sum + Number(item.amount || 0),
                    0
                );

                const subscriptionCost = Number(subscriptionSummary?.monthlyCost || 0);

                const recurringCost = recurringExpenses
                    .filter(item => item.status === 'Active')
                    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

                const categoryMap = {};
                expenses.forEach(item => {
                    const category = item.category || 'Other';
                    categoryMap[category] = (categoryMap[category] || 0) + Number(item.amount || 0);
                });

                setAutoData({
                    monthlyIncome: totalIncome,
                    monthlyExpenses: totalExpenses,
                    subscriptionsCost: subscriptionCost,
                    recurringExpensesCost: recurringCost,
                    expenseCategories: categoryMap
                });

                const activeGoal =
                    futurePlannerGoals.find(goal => goal.status === 'Active') ||
                    futurePlannerGoals[0];

                if (activeGoal) {
                    fillGoalData(activeGoal);
                }
            } catch (error) {
                console.error('Failed to load monthly goal calculator data:', error);
            } finally {
                setLoadingData(false);
            }
        };

        if (user?.token) {
            fetchData();
        }
    }, [user?.token, API_BASE]);

    const handleGoalSelect = (goalId) => {
        const selectedGoal = goals.find(goal => (goal._id || goal.id) === goalId);
        fillGoalData(selectedGoal);
    };

    const monthlyFixedExpenses =
        autoData.monthlyExpenses +
        autoData.subscriptionsCost +
        autoData.recurringExpensesCost;

    const availableAfterExpenses = autoData.monthlyIncome - monthlyFixedExpenses;

    const handleCalculate = (e) => {
        e.preventDefault();

        const target = Number(targetAmount || 0);
        const saved = Number(currentSaved || 0);
        const needToSave = Math.max(0, target - saved);
        const available = Math.max(0, availableAfterExpenses);
        const shortfall = Math.max(0, needToSave - available);

        const resultObj = {
            target,
            saved,
            needToSave,
            income: autoData.monthlyIncome,
            totalExpenses: monthlyFixedExpenses,
            subscriptions: autoData.subscriptionsCost,
            recurringExpenses: autoData.recurringExpensesCost,
            availableAfterExpenses: available,
            shortfall,
            isPossible: available >= needToSave,
            suggestions: [],
            progress: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0
        };

        if (target <= 0) {
            setResult({
                ...resultObj,
                message: 'Please select a Future Planner goal or enter a valid target amount.',
                error: true
            });
            return;
        }

        if (saved >= target) {
            setResult({
                ...resultObj,
                message: 'Congratulations! This Future Planner goal is already achieved.',
                isAlreadyAchieved: true,
                progress: 100
            });
            return;
        }

        if (autoData.monthlyIncome <= 0) {
            setResult({
                ...resultObj,
                message: 'No income data found. Please add income first.',
                error: true
            });
            return;
        }

        if (resultObj.isPossible) {
            resultObj.message = `This goal is possible this month. You already saved ₹${saved.toLocaleString()} in Future Planner. You still need ₹${needToSave.toLocaleString()}, and you have ₹${available.toLocaleString()} available after monthly expenses.`;
        } else {
            resultObj.message = `This goal is not possible this month with your current income and expenses. You already saved ₹${saved.toLocaleString()} in Future Planner, but you still need ₹${needToSave.toLocaleString()}.`;

            const categories = Object.entries(autoData.expenseCategories)
                .map(([category, amount]) => ({ category, amount }))
                .filter(item => item.amount > 0)
                .sort((a, b) => b.amount - a.amount);

            let remainingReduction = shortfall;

            categories.forEach(({ category, amount }) => {
                if (remainingReduction <= 0) return;

                const reduction = Math.min(amount * 0.5, remainingReduction);

                if (reduction >= 500) {
                    resultObj.suggestions.push(
                        `Reduce ${category} spending by ₹${Math.round(reduction).toLocaleString()}`
                    );
                    remainingReduction -= reduction;
                }
            });

            if (remainingReduction > 0) {
                resultObj.suggestions.push(
                    `Reduce other non-essential spending by ₹${Math.round(remainingReduction).toLocaleString()}`
                );
            }
        }

        setResult(resultObj);
    };

    if (loadingData) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800">Monthly Goal Calculator</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                    <p className="text-xs text-gray-500">Total Monthly Income</p>
                    <p className="text-xl font-bold text-success">
                        ₹{autoData.monthlyIncome.toLocaleString()}
                    </p>
                </div>

                <div className="glass-card p-4">
                    <p className="text-xs text-gray-500">Monthly Expenses</p>
                    <p className="text-xl font-bold text-danger">
                        ₹{monthlyFixedExpenses.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-400">
                        Expenses: ₹{autoData.monthlyExpenses.toLocaleString()} + Subs: ₹{autoData.subscriptionsCost.toLocaleString()} + Recurring: ₹{autoData.recurringExpensesCost.toLocaleString()}
                    </p>
                </div>

                <div className="glass-card p-4">
                    <p className="text-xs text-gray-500">Available After Expenses</p>
                    <p className={`text-xl font-bold ${availableAfterExpenses >= 0 ? 'text-success' : 'text-danger'}`}>
                        ₹{Math.max(0, availableAfterExpenses).toLocaleString()}
                    </p>
                </div>

                <div className="glass-card p-4">
                    <p className="text-xs text-gray-500">Future Planner Saved</p>
                    <p className="text-xl font-bold text-primary">
                        ₹{Number(currentSaved || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-400">
                        From selected goal
                    </p>
                </div>
            </div>

            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold flex items-center mb-4">
                    <Calculator size={20} className="mr-2 text-primary" />
                    Goal Details
                </h3>

                <form onSubmit={handleCalculate}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Select Future Planner Goal</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                                value={selectedGoalId}
                                onChange={e => handleGoalSelect(e.target.value)}
                            >
                                <option value="">Select a goal</option>
                                {goals.map(goal => (
                                    <option key={goal._id || goal.id} value={goal._id || goal.id}>
                                        {getGoalName(goal)} - Saved ₹{getGoalSaved(goal).toLocaleString()} / ₹{getGoalTarget(goal).toLocaleString()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Goal Name</label>
                            <input
                                type="text"
                                required
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                                value={goalName}
                                onChange={e => setGoalName(e.target.value)}
                                placeholder="e.g. Trip"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Target Amount ₹</label>
                            <input
                                type="number"
                                required
                                min="1"
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                                value={targetAmount}
                                onChange={e => setTargetAmount(e.target.value)}
                                placeholder="e.g. 20000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Current Saved Amount ₹</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                                value={currentSaved}
                                onChange={e => setCurrentSaved(e.target.value)}
                                placeholder="Future Planner saved amount"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Target Month / Deadline</label>
                            <input
                                type="month"
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                            />
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 mb-4">
                        * Goal name, target amount, and saved amount are auto-filled from your Future Planner goal.
                    </p>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-primary to-secondary text-white py-2.5 rounded-lg hover:opacity-90 transition font-medium"
                    >
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
                                <p className="text-sm text-gray-600">{result.message}</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">Progress</span>
                                    <span className="font-medium">{result.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-primary h-3 rounded-full"
                                        style={{ width: `${result.progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div className="bg-white p-3 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase">Future Planner Saved</p>
                                    <p className="font-bold text-lg text-primary">
                                        ₹{result.saved.toLocaleString()}
                                    </p>
                                </div>

                                <div className="bg-white p-3 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase">Still Need</p>
                                    <p className="font-bold text-lg text-gray-800">
                                        ₹{result.needToSave.toLocaleString()}
                                    </p>
                                </div>

                                <div className="bg-white p-3 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase">Total Income</p>
                                    <p className="font-bold text-lg text-success">
                                        ₹{result.income.toLocaleString()}
                                    </p>
                                </div>

                                <div className="bg-white p-3 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase">Available</p>
                                    <p className={`font-bold text-lg ${result.availableAfterExpenses > 0 ? 'text-success' : 'text-danger'}`}>
                                        ₹{result.availableAfterExpenses.toLocaleString()}
                                    </p>
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

                                        <p className="text-sm text-gray-600 mt-1">
                                            {result.message}
                                        </p>

                                        {result.shortfall > 0 && (
                                            <p className="text-sm font-medium text-danger mt-1">
                                                Shortfall: ₹{result.shortfall.toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {result.suggestions.length > 0 && (
                                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Lightbulb size={18} className="text-primary" />
                                        <p className="font-semibold text-sm text-primary">
                                            Suggestions - Where to Reduce Spending
                                        </p>
                                    </div>

                                    <ul className="space-y-1">
                                        {result.suggestions.map((suggestion, index) => (
                                            <li key={index} className="text-sm text-gray-700 flex items-start space-x-2">
                                                <span className="text-primary mt-0.5">•</span>
                                                <span>{suggestion}</span>
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