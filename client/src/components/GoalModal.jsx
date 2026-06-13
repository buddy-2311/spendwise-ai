import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const categories = ['Emergency Fund', 'Health', 'Dream Car', 'House Down Payment', 'Personal', 'Trip', 'Education', 'Wedding', 'Retirement', 'Business', 'Investment', 'Other'];

const GoalModal = ({ goal, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: '', category: 'Emergency Fund', targetAmount: '', currentAmount: '0', 
        monthlyContribution: '', targetDate: '', priority: 'Medium', status: 'Active'
    });

    useEffect(() => {
        if (goal) {
            setFormData({
                title: goal.title, category: goal.category, targetAmount: goal.targetAmount,
                currentAmount: goal.currentAmount || 0, monthlyContribution: goal.monthlyContribution || '',
                targetDate: goal.targetDate ? goal.targetDate.split('T')[0] : '', priority: goal.priority, status: goal.status
            });
        }
    }, [goal]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, targetAmount: Number(formData.targetAmount), currentAmount: Number(formData.currentAmount), monthlyContribution: Number(formData.monthlyContribution) });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold">{goal ? 'Edit Goal' : 'Create New Goal'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <form id="goal-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1">Goal Title</label>
                                <input type="text" required className="w-full border rounded-lg px-3 py-2" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Europe Trip 2026" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Category</label>
                                <select className="w-full border rounded-lg px-3 py-2" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Priority</label>
                                <select className="w-full border rounded-lg px-3 py-2" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Target Amount (₹)</label>
                                <input type="number" required min="1" className="w-full border rounded-lg px-3 py-2" value={formData.targetAmount} onChange={e => setFormData({...formData, targetAmount: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Already Saved (₹)</label>
                                <input type="number" min="0" className="w-full border rounded-lg px-3 py-2" value={formData.currentAmount} onChange={e => setFormData({...formData, currentAmount: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Target Date</label>
                                <input type="date" className="w-full border rounded-lg px-3 py-2" value={formData.targetDate} onChange={e => setFormData({...formData, targetDate: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Planned Monthly Save (₹)</label>
                                <input type="number" min="0" className="w-full border rounded-lg px-3 py-2" value={formData.monthlyContribution} onChange={e => setFormData({...formData, monthlyContribution: e.target.value})} />
                            </div>
                            {goal && (
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">Status</label>
                                    <select className="w-full border rounded-lg px-3 py-2" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                        <option value="Active">Active</option>
                                        <option value="Paused">Paused</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
                <div className="p-6 border-t flex justify-end space-x-3 bg-gray-50 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button>
                    <button type="submit" form="goal-form" className="px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary/90">Save Goal</button>
                </div>
            </div>
        </div>
    );
};

export default GoalModal;
