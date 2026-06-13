import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Target, TrendingUp, Calendar, AlertCircle, Plus, Edit2, Trash2, PieChart as PieChartIcon, Check, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import GoalModal from '../components/GoalModal';
import ConfirmModal from '../components/common/ConfirmModal';

const COLORS = ['#4F46E5', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#14B8A6'];

const FuturePlanner = () => {
    const { user } = useContext(AuthContext);
    const [goals, setGoals] = useState([]);
    const [summary, setSummary] = useState({});
    const [insights, setInsights] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editGoal, setEditGoal] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [undoConfirm, setUndoConfirm] = useState(null);

    const fetchData = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const [goalsRes, summaryRes, insightsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/goals', config),
                axios.get('http://localhost:5000/api/goals/summary/dashboard', config),
                axios.get('http://localhost:5000/api/goals/insights/future', config)
            ]);
            setGoals(goalsRes.data);
            setSummary(summaryRes.data);
            setInsights(insightsRes.data.insights || []);
        } catch (error) {
            console.error("Error fetching future planner data", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.delete(`http://localhost:5000/api/goals/${id}`, config);
            toast.success('Goal deleted successfully');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete goal');
        }
    };

    const handleSaveGoal = async (goalData) => {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        if (editGoal) {
            await axios.put(`http://localhost:5000/api/goals/${editGoal._id}`, goalData, config);
        } else {
            await axios.post('http://localhost:5000/api/goals', goalData, config);
        }
        setShowModal(false);
        setEditGoal(null);
        fetchData();
    };

    const handleAddMonthlyContribution = async (goalId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.patch(`http://localhost:5000/api/goals/${goalId}/add-monthly-contribution`, {}, config);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add contribution');
        }
    };

    const handleRemoveMonthlyContribution = async (goalId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.delete(`http://localhost:5000/api/goals/${goalId}/remove-monthly-contribution`, config);
            toast.success('Contribution undone successfully');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove contribution');
        }
    };

    const categoryData = goals.reduce((acc, curr) => {
        const found = acc.find(a => a.name === curr.category);
        if (found) found.value += curr.targetAmount;
        else acc.push({ name: curr.category, value: curr.targetAmount });
        return acc;
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Future Planner</h1>
                    <p className="text-gray-500">Plan Today, Achieve Tomorrow</p>
                </div>
                <button onClick={() => { setEditGoal(null); setShowModal(true); }} className="flex items-center space-x-2 bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-colors shadow-md">
                    <Plus size={18} />
                    <span>Create Goal</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Target</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">₹{summary.totalTarget?.toLocaleString() || 0}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Target size={24} />
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Saved</p>
                        <h3 className="text-2xl font-bold text-success mt-1">₹{summary.totalSaved?.toLocaleString() || 0}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success">
                        <TrendingUp size={24} />
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Remaining</p>
                        <h3 className="text-2xl font-bold text-danger mt-1">₹{summary.remainingAmount?.toLocaleString() || 0}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger">
                        <AlertCircle size={24} />
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Completed</p>
                        <h3 className="text-2xl font-bold text-secondary mt-1">{summary.completedGoals || 0}/{summary.totalGoals || 0}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                        <Calendar size={24} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-bold text-gray-800">Your Goals</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {goals.map(goal => {
                            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                            const currentMonth = new Date().toLocaleString('default', { month: 'long' });
                            const currentYear = new Date().getFullYear();
                            const hasContributedThisMonth = goal.contributions?.some(c => c.month === currentMonth && c.year === currentYear);
                            
                            let lastContributionText = "No contribution added this month";
                            if (goal.contributions && goal.contributions.length > 0) {
                                const lastC = goal.contributions[goal.contributions.length - 1];
                                lastContributionText = `Last contribution: ${new Date(lastC.date).toLocaleDateString()}`;
                            }

                            return (
                                <div key={goal._id} className="glass-card p-5 group hover:shadow-xl transition-shadow relative overflow-hidden flex flex-col justify-between">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-bold text-lg">{goal.title}</h4>
                                                <span className="text-xs text-gray-500">{goal.category}</span>
                                            </div>
                                            <div className="flex space-x-2">
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${goal.status === 'Completed' ? 'bg-success/10 text-success' : goal.status === 'Paused' ? 'bg-gray-100 text-gray-600' : 'bg-primary/10 text-primary'}`}>
                                                    {goal.status}
                                                </span>
                                                <div className="hidden group-hover:flex space-x-1">
                                                    <button onClick={() => { setEditGoal(goal); setShowModal(true); }} className="p-1 text-gray-400 hover:text-primary"><Edit2 size={16} /></button>
                                                    <button onClick={() => setDeleteConfirm(goal._id)} className="p-1 text-gray-400 hover:text-danger"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Saved: <strong className="text-gray-800">₹{goal.currentAmount.toLocaleString()}</strong></span>
                                                <span className="text-gray-500">Target: <strong className="text-gray-800">₹{goal.targetAmount.toLocaleString()}</strong></span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span>{progress.toFixed(1)}% Completed</span>
                                                {goal.targetDate && <span>Due: {new Date(goal.targetDate).toLocaleDateString()}</span>}
                                            </div>
                                            {goal.monthlyContribution > 0 && (
                                                <div className="bg-gray-50 p-2 rounded text-sm text-gray-600 mt-2">
                                                    Requires <strong>₹{goal.monthlyContribution.toLocaleString()}/month</strong>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        {goal.status === 'Completed' ? (
                                            <button disabled className="w-full py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed">Goal Completed</button>
                                        ) : goal.status === 'Paused' ? (
                                            <button disabled className="w-full py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed">Goal Paused</button>
                                        ) : !goal.monthlyContribution || goal.monthlyContribution <= 0 ? (
                                            <button disabled className="w-full py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed">Please set monthly contribution first</button>
                                        ) : hasContributedThisMonth ? (
                                            <div className="flex items-center justify-between">
                                                <button disabled className="flex-1 py-2 bg-success/10 text-success rounded-lg text-sm font-medium flex items-center justify-center cursor-default">
                                                    <Check size={16} className="mr-2" /> Added This Month
                                                </button>
                                                <button onClick={() => setUndoConfirm(goal._id)} className="ml-2 p-2 text-gray-400 hover:text-danger rounded-lg transition-colors" title="Undo contribution">
                                                    <XCircle size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleAddMonthlyContribution(goal._id)} className="w-full py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-md flex items-center justify-center">
                                                <Plus size={16} className="mr-2" /> Add ₹{goal.monthlyContribution.toLocaleString()} This Month
                                            </button>
                                        )}
                                        <p className="text-xs text-gray-400 text-center mt-2">{lastContributionText}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {goals.length === 0 && (
                            <div className="col-span-2 text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <Target size={48} className="mx-auto mb-4 text-gray-400" />
                                <p>No financial goals set yet.</p>
                                <button onClick={() => setShowModal(true)} className="mt-4 text-primary font-medium hover:underline">Create your first goal</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6 bg-gradient-to-br from-secondary/5 to-primary/5 border-primary/20">
                        <h3 className="text-lg font-semibold mb-4 flex items-center"><PieChartIcon size={20} className="mr-2 text-primary" /> Goal Distribution</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categoryData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                        {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="glass-card p-6 border-l-4 border-secondary">
                        <h3 className="text-lg font-semibold mb-4">AI Future Insights</h3>
                        {insights.length > 0 ? (
                            <ul className="space-y-3">
                                {insights.map((insight, idx) => (
                                    <li key={idx} className="text-sm text-gray-700 bg-white p-3 rounded shadow-sm border border-gray-100">{insight}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500">Add more goals to receive AI recommendations.</p>
                        )}
                    </div>
                </div>
            </div>

            {showModal && <GoalModal goal={editGoal} onClose={() => setShowModal(false)} onSave={handleSaveGoal} />}

            {/* Delete Goal Confirm Modal */}
            <ConfirmModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => handleDelete(deleteConfirm)}
                title="Delete Goal?"
                message="Are you sure you want to delete this goal? This action cannot be undone."
                confirmText="Delete"
                confirmColor="danger"
                icon="trash"
            />

            {/* Undo Contribution Confirm Modal */}
            <ConfirmModal
                isOpen={!!undoConfirm}
                onClose={() => setUndoConfirm(null)}
                onConfirm={() => handleRemoveMonthlyContribution(undoConfirm)}
                title="Undo Contribution?"
                message="Are you sure you want to undo this month's contribution? The saved amount will be removed."
                confirmText="Undo"
                confirmColor="danger"
                icon="warning"
            />
        </div>
    );
};

export default FuturePlanner;
