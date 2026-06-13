import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Edit2, Trash2, PauseCircle, PlayCircle, X } from 'lucide-react';
import RecurringExpenseModal from './RecurringExpenseModal';
import ConfirmModal from '../common/ConfirmModal';
import toast from 'react-hot-toast';

const RecurringExpenseList = ({ isOpen, onClose, onUpdate }) => {
    const { user } = useContext(AuthContext);
    const [expenses, setExpenses] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const fetchRecurring = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const res = await axios.get('https://spendwise-ai-fwmp.onrender.com/api/recurring-expenses', config);
            setExpenses(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchRecurring();
        }
    }, [isOpen]);

    const handleToggleStatus = async (id) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.patch(`https://spendwise-ai-fwmp.onrender.com/api/recurring-expenses/${id}/status`, {}, config);
            fetchRecurring();
            onUpdate();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.delete(`https://spendwise-ai-fwmp.onrender.com/api/recurring-expenses/${id}`, config);
            toast.success('Recurring expense deleted successfully');
            fetchRecurring();
            onUpdate();
        } catch (error) {
            toast.error('Failed to delete recurring expense');
            console.error(error);
        }
    };

    const getRecurrenceLabel = (exp) => {
        const type = exp.recurrenceType || 'Monthly';
        if (type === 'Yearly') return 'per year';
        if (type === 'Custom' && exp.durationMonths) return `per month, ${exp.durationMonths} months`;
        return 'per month';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
            <div className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-4xl shadow-xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">Manage Recurring Expenses</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="overflow-y-auto flex-1 pr-2">
                    {expenses.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No recurring expenses found.</p>
                    ) : (
                        <div className="grid gap-4">
                            {expenses.map(exp => (
                                <div key={exp._id} className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center ${exp.status === 'Active' ? 'border-primary/20 bg-primary/5' : 'border-gray-200 bg-gray-50'}`}>
                                    <div className="flex-1 w-full sm:w-auto">
                                        <div className="flex items-center space-x-2 flex-wrap">
                                            <h3 className="font-semibold text-base md:text-lg text-gray-800">{exp.title}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${exp.status === 'Active' ? 'bg-success/10 text-success' : 'bg-gray-200 text-gray-600'}`}>{exp.status}</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{exp.recurrenceType || 'Monthly'}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">{exp.category} • Due on day {exp.dueDay} • Started {new Date(exp.startDate).toLocaleDateString()}</p>
                                        {exp.note && <p className="text-xs text-gray-400 mt-0.5">{exp.note}</p>}
                                    </div>
                                    <div className="mt-3 sm:mt-0 flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                                        <div className="text-right">
                                            <p className="font-bold text-base md:text-lg text-danger">-₹{exp.amount}</p>
                                            <p className="text-xs text-gray-400">{getRecurrenceLabel(exp)}</p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button onClick={() => handleToggleStatus(exp._id)} className={`p-2 rounded-lg transition-colors ${exp.status === 'Active' ? 'bg-warning/10 text-warning hover:bg-warning/20' : 'bg-success/10 text-success hover:bg-success/20'}`} title={exp.status === 'Active' ? 'Pause' : 'Resume'}>
                                                {exp.status === 'Active' ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                                            </button>
                                            <button onClick={() => { setEditingExpense(exp); setShowEditModal(true); }} className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => setDeleteConfirm(exp._id)} className="p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showEditModal && (
                <RecurringExpenseModal 
                    isOpen={showEditModal} 
                    onClose={() => { setShowEditModal(false); setEditingExpense(null); }} 
                    editExpense={editingExpense} 
                    onSave={() => { setShowEditModal(false); setEditingExpense(null); fetchRecurring(); onUpdate(); }} 
                />
            )}

            <ConfirmModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => handleDelete(deleteConfirm)}
                title="Delete Recurring Expense?"
                message="Are you sure you want to delete this recurring expense? This action cannot be undone."
                confirmText="Delete"
                confirmColor="danger"
                icon="trash"
            />
        </div>
    );
};

export default RecurringExpenseList;
