import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const RecurringExpenseModal = ({ isOpen, onClose, onSave, editExpense }) => {
    const { user } = useContext(AuthContext);
    
    const [title, setTitle] = useState(editExpense?.title || '');
    const [category, setCategory] = useState(editExpense?.category || 'Bills');
    const [amount, setAmount] = useState(editExpense?.amount || '');
    const [startDate, setStartDate] = useState(editExpense?.startDate ? new Date(editExpense.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    const [dueDay, setDueDay] = useState(editExpense?.dueDay || 1);
    const [endDate, setEndDate] = useState(editExpense?.endDate ? new Date(editExpense.endDate).toISOString().slice(0, 10) : '');
    const [recurrenceType, setRecurrenceType] = useState(editExpense?.recurrenceType || 'Monthly');
    const [durationMonths, setDurationMonths] = useState(editExpense?.durationMonths || '');
    const [note, setNote] = useState(editExpense?.note || '');
    const [status, setStatus] = useState(editExpense?.status || 'Active');

    const categories = ['Food', 'Travel', 'Shopping', 'Bills', 'Education', 'Rent', 'Subscriptions', 'Healthcare', 'Others'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const data = {
            title, category, amount: Number(amount), startDate, dueDay: Number(dueDay),
            endDate: endDate || null, recurrenceType, status,
            durationMonths: recurrenceType === 'Custom' ? Number(durationMonths) : null,
            note: note || ''
        };

        try {
            if (editExpense) {
                await axios.put(`https://spendwise-ai-fwmp.onrender.com/api/recurring-expenses/${editExpense._id}`, data, config);
                toast.success("Recurring expense updated successfully");
            } else {
                await axios.post('https://spendwise-ai-fwmp.onrender.com/api/recurring-expenses', data, config);
                toast.success("Recurring expense added successfully");
            }
            onSave();
        } catch (error) {
            console.error(error);
            toast.error("Error saving recurring expense");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl my-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{editExpense ? 'Edit Recurring Expense' : 'Add Recurring Expense'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expense Name</label>
                        <input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Netflix" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={category} onChange={(e) => setCategory(e.target.value)}>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                            <input type="number" required min="1" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 499" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input type="date" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Due Day</label>
                            <input type="number" required min="1" max="31" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence Type</label>
                            <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)}>
                                <option value="Monthly">Monthly</option>
                                <option value="Yearly">Yearly</option>
                                <option value="Custom">Custom Months</option>
                            </select>
                        </div>
                        {recurrenceType === 'Custom' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label>
                                <input type="number" required min="1" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} placeholder="e.g. 6" />
                            </div>
                        )}
                        {recurrenceType !== 'Custom' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                                <input type="date" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option value="Active">Active</option>
                                <option value="Paused">Paused</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Optional Note</label>
                            <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Family plan" />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RecurringExpenseModal;
