import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import AutoBadge from '../components/transactions/AutoBadge';
import RecurringExpenseModal from '../components/transactions/RecurringExpenseModal';
import RecurringExpenseList from '../components/transactions/RecurringExpenseList';

const Transactions = () => {
    const { user } = useContext(AuthContext);
    const [transactions, setTransactions] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showRecurringAddModal, setShowRecurringAddModal] = useState(false);
    const [showRecurringListModal, setShowRecurringListModal] = useState(false);
    
    const [type, setType] = useState('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Food');
    const [note, setNote] = useState('');
    const [source, setSource] = useState('Salary');

    const categories = ['Food', 'Travel', 'Shopping', 'Bills', 'Education', 'Rent', 'Subscriptions', 'Healthcare', 'Others'];

    const fetchData = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            
            // First generate any pending recurring expenses
            await axios.post('https://spendwise-ai-fwmp.onrender.com/api/recurring-expenses/generate-current-month', {}, config);
            
            const [expRes, incRes] = await Promise.all([
                axios.get('https://spendwise-ai-fwmp.onrender.com/api/expenses', config),
                axios.get('https://spendwise-ai-fwmp.onrender.com/api/income', config)
            ]);
            
            const formattedExp = expRes.data.map(t => ({ ...t, type: 'expense' }));
            const formattedInc = incRes.data.map(t => ({ ...t, type: 'income', category: t.source }));
            
            const allTrans = [...formattedExp, ...formattedInc].sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(allTrans);
        } catch (error) {
            console.error("Error fetching data", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        if (type === 'expense') {
            await axios.post('https://spendwise-ai-fwmp.onrender.com/api/expenses', { amount, category, note }, config);
        } else {
            await axios.post('https://spendwise-ai-fwmp.onrender.com/api/income', { amount, source }, config);
        }
        setShowModal(false);
        fetchData();
    };

    const handleDelete = async (id, transType) => {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        if (transType === 'expense') {
            await axios.delete(`https://spendwise-ai-fwmp.onrender.com/api/expenses/${id}`, config);
        } else {
            await axios.delete(`https://spendwise-ai-fwmp.onrender.com/api/income/${id}`, config);
        }
        fetchData();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => setShowRecurringListModal(true)} className="flex items-center space-x-2 bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        <Settings2 size={18} />
                        <span>Manage Recurring</span>
                    </button>
                    <button onClick={() => setShowRecurringAddModal(true)} className="flex items-center space-x-2 bg-secondary text-white px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors shadow-sm">
                        <Plus size={18} />
                        <span>Recurring Expense</span>
                    </button>
                    <button onClick={() => setShowModal(true)} className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
                        <Plus size={18} />
                        <span>Add Transaction</span>
                    </button>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="glass-card overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 font-medium text-gray-500">Date</th>
                                <th className="p-4 font-medium text-gray-500">Type</th>
                                <th className="p-4 font-medium text-gray-500">Category/Source</th>
                                <th className="p-4 font-medium text-gray-500">Note</th>
                                <th className="p-4 font-medium text-gray-500">Amount</th>
                                <th className="p-4 font-medium text-gray-500">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((t) => (
                                <tr key={t._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 text-sm text-gray-600">{new Date(t.date).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                            {t.type.toUpperCase()}
                                        </span>
                                        {t.autoGenerated && <AutoBadge />}
                                    </td>
                                    <td className="p-4 text-sm text-gray-700">{t.category}</td>
                                    <td className="p-4 text-sm text-gray-500">{t.note || '-'}</td>
                                    <td className={`p-4 font-medium ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                                        {t.type === 'income' ? '+' : '-'}₹{t.amount}
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => handleDelete(t._id, t.type)} className="text-gray-400 hover:text-danger transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {transactions.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No transactions yet</p>
                ) : (
                    transactions.map((t) => (
                        <div key={t._id} className="glass-card p-4 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                        {t.type.toUpperCase()}
                                    </span>
                                    {t.autoGenerated && <AutoBadge />}
                                </div>
                                <p className="text-sm font-medium text-gray-800 mt-1 truncate">{t.category}{t.note ? ` - ${t.note}` : ''}</p>
                                <p className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className={`font-semibold ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                                    {t.type === 'income' ? '+' : '-'}₹{t.amount}
                                </div>
                                <button onClick={() => handleDelete(t._id, t.type)} className="text-gray-400 hover:text-danger transition-colors flex-shrink-0">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Add Transaction</h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="flex space-x-4 mb-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" value="expense" checked={type === 'expense'} onChange={() => setType('expense')} className="accent-primary" />
                                    <span>Expense</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" value="income" checked={type === 'income'} onChange={() => setType('income')} className="accent-primary" />
                                    <span>Income</span>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                <input type="number" required min="1" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={amount} onChange={(e) => setAmount(e.target.value)} />
                            </div>
                            {type === 'expense' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={category} onChange={(e) => setCategory(e.target.value)}>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                                    <input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={source} onChange={(e) => setSource(e.target.value)} />
                                </div>
                            )}
                            {type === 'expense' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
                                    <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={note} onChange={(e) => setNote(e.target.value)} />
                                </div>
                            )}
                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <RecurringExpenseModal 
                isOpen={showRecurringAddModal} 
                onClose={() => setShowRecurringAddModal(false)} 
                onSave={() => { setShowRecurringAddModal(false); fetchData(); }} 
            />

            <RecurringExpenseList 
                isOpen={showRecurringListModal} 
                onClose={() => setShowRecurringListModal(false)} 
                onUpdate={fetchData} 
            />
        </div>
    );
};

export default Transactions;
