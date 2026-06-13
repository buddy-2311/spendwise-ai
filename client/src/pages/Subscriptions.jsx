import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getSubscriptions, getSubscriptionSummary, createSubscription, updateSubscription, deleteSubscription, updateSubscriptionStatus, generateRenewalExpenses } from '../services/subscriptionService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { Plus, Trash2, Edit3, Pause, Play, X, CreditCard, Calendar, RefreshCw, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const COLORS = ['#4F46E5','#8B5CF6','#F59E0B','#10B981','#EF4444','#3B82F6','#EC4899'];
const SUB_CATEGORIES = ['Streaming','Music','Cloud','Fitness','Education','News','Software','Insurance','Internet','Mobile','Other'];
const statusColors = { Active:'bg-green-100 text-green-700', Paused:'bg-yellow-100 text-yellow-700', Cancelled:'bg-red-100 text-red-700' };

const Subscriptions = () => {
    const { user } = useContext(AuthContext);
    const [subs, setSubs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editSub, setEditSub] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [form, setForm] = useState({ name:'', category:'Streaming', amount:'', billingCycle:'Monthly', durationMonths:'', startDate:'', renewalDate:'', paymentMethod:'', notes:'', autoAddToExpense:false });

    const fetchData = async () => {
        try {
            setLoading(true);
            await generateRenewalExpenses(user.token);
            const [subsRes, sumRes] = await Promise.all([getSubscriptions(user.token), getSubscriptionSummary(user.token)]);
            setSubs(subsRes.data); setSummary(sumRes.data);
        } catch { toast.error('Failed to load subscriptions'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editSub) { await updateSubscription(user.token, editSub._id, form); toast.success('Updated'); }
            else { await createSubscription(user.token, form); toast.success('Created'); }
            setShowModal(false); setEditSub(null); resetForm(); fetchData();
        } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    };

    const handleDelete = async (id) => {
        try { await deleteSubscription(user.token, id); toast.success('Deleted'); setDeleteConfirm(null); fetchData(); }
        catch { toast.error('Failed'); }
    };

    const handleStatusChange = async (id, status) => {
        try { await updateSubscriptionStatus(user.token, id, status); toast.success(`Status: ${status}`); fetchData(); }
        catch { toast.error('Failed'); }
    };

    const resetForm = () => setForm({ name:'', category:'Streaming', amount:'', billingCycle:'Monthly', durationMonths:'', startDate:'', renewalDate:'', paymentMethod:'', notes:'', autoAddToExpense:false });

    const catChartData = summary?.categoryBreakdown ? Object.entries(summary.categoryBreakdown).map(([name,value])=>({name,value:Math.round(value)})) : [];

    if (loading) return <div className="space-y-6"><div className="h-8 bg-gray-200 rounded animate-pulse w-48"/><div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse"/>)}</div></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-2xl font-bold text-gray-800">Subscriptions</h1><p className="text-gray-500 text-sm mt-1">Track recurring subscriptions and memberships</p></div>
                <button onClick={()=>{setEditSub(null);resetForm();setShowModal(true);}} className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm"><Plus size={16}/><span>Add Subscription</span></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {label:'Active',val:summary?.activeCount||0,icon:<CreditCard size={22}/>,cls:'primary'},
                    {label:'Monthly Cost',val:`₹${(summary?.monthlyCost||0).toLocaleString()}`,icon:<Calendar size={22}/>,cls:'secondary'},
                    {label:'Yearly Cost',val:`₹${(summary?.yearlyCost||0).toLocaleString()}`,icon:<RefreshCw size={22}/>,cls:'success'},
                    {label:'Upcoming',val:summary?.upcomingCount||0,icon:<Calendar size={22}/>,cls:'danger'}
                ].map((c,i)=>(
                    <motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}} className="glass-card p-5 flex items-center justify-between">
                        <div><p className="text-sm text-gray-500">{c.label}</p><h3 className="text-xl font-bold mt-1">{c.val}</h3></div>
                        <div className={`w-11 h-11 rounded-full bg-${c.cls}/10 flex items-center justify-center text-${c.cls}`}>{c.icon}</div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {subs.length > 0 ? subs.map((s,i)=>(
                        <motion.div key={s._id} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}} className="glass-card p-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center space-x-3">
                                        <h4 className="font-semibold text-gray-800">{s.name}</h4>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[s.status]}`}>{s.status}</span>
                                        {s.autoAddToExpense && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Auto</span>}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{s.category} · {s.billingCycle}{s.billingCycle === 'Custom' && s.durationMonths ? ` (${s.durationMonths} mo)` : ''} · ₹{s.amount.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400 mt-1">Renewal: {new Date(s.renewalDate).toLocaleDateString()} {s.paymentMethod && `· ${s.paymentMethod}`}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {s.status==='Active' && <button onClick={()=>handleStatusChange(s._id,'Paused')} className="text-gray-400 hover:text-yellow-500" title="Pause"><Pause size={16}/></button>}
                                    {s.status==='Paused' && <button onClick={()=>handleStatusChange(s._id,'Active')} className="text-gray-400 hover:text-green-500" title="Resume"><Play size={16}/></button>}
                                    {s.status!=='Cancelled' && <button onClick={()=>handleStatusChange(s._id,'Cancelled')} className="text-gray-400 hover:text-red-500" title="Cancel"><XCircle size={16}/></button>}
                                    <button onClick={()=>{setEditSub(s);setForm({name:s.name,category:s.category,amount:s.amount,billingCycle:s.billingCycle,durationMonths:s.durationMonths||'',startDate:s.startDate?.slice(0,10)||'',renewalDate:s.renewalDate?.slice(0,10)||'',paymentMethod:s.paymentMethod||'',notes:s.notes||'',autoAddToExpense:s.autoAddToExpense});setShowModal(true);}} className="text-gray-400 hover:text-primary"><Edit3 size={16}/></button>
                                    <button onClick={()=>setDeleteConfirm(s._id)} className="text-gray-400 hover:text-danger"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        </motion.div>
                    )) : <div className="glass-card p-12 text-center"><CreditCard size={48} className="mx-auto text-gray-300 mb-4"/><p className="text-gray-500">No subscriptions yet</p></div>}
                </div>
                <div className="glass-card p-5"><h3 className="text-lg font-semibold mb-4">Cost by Category</h3>{catChartData.length>0?<><div className="h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={catChartData} innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">{catChartData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><RTooltip formatter={v=>`₹${v.toLocaleString()}/mo`}/></PieChart></ResponsiveContainer></div><div className="mt-4 space-y-2">{catChartData.map((d,i)=><div key={d.name} className="flex items-center justify-between text-sm"><div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor:COLORS[i%COLORS.length]}}/><span className="text-gray-600">{d.name}</span></div><span className="font-medium">₹{d.value.toLocaleString()}/mo</span></div>)}</div></>:<p className="text-gray-400 text-center py-12">No data</p>}</div>
            </div>

            <AnimatePresence>{showModal&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{editSub?'Edit':'Add'} Subscription</h2><button onClick={()=>{setShowModal(false);setEditSub(null);}} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="Netflix"/></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full px-3 py-2 border rounded-lg">{SUB_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label><input type="number" required min="1" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label><select value={form.billingCycle} onChange={e=>setForm({...form,billingCycle:e.target.value})} className="w-full px-3 py-2 border rounded-lg">{['Monthly','Quarterly','Yearly','Custom'].map(c=><option key={c}>{c}</option>)}</select></div>
                        {form.billingCycle === 'Custom' ? (
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label><input type="number" required min="1" value={form.durationMonths} onChange={e=>setForm({...form,durationMonths:e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g. 6"/></div>
                        ) : (
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label><input type="text" value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="UPI / Card"/></div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label><input type="date" required value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date</label><input type="date" required value={form.renewalDate} onChange={e=>setForm({...form,renewalDate:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><input type="text" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div>
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={form.autoAddToExpense} onChange={e=>setForm({...form,autoAddToExpense:e.target.checked})} className="accent-primary"/><span className="text-sm">Auto-add to expenses on renewal</span></label>
                    <div className="flex justify-end space-x-3 mt-4"><button type="button" onClick={()=>{setShowModal(false);setEditSub(null);}} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">{editSub?'Update':'Create'}</button></div>
                </form>
            </motion.div></motion.div>}</AnimatePresence>

            <AnimatePresence>{deleteConfirm&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center"><Trash2 size={40} className="mx-auto text-danger mb-3"/><h3 className="text-lg font-bold mb-2">Delete Subscription?</h3><p className="text-sm text-gray-500 mb-4">This cannot be undone.</p><div className="flex justify-center space-x-3"><button onClick={()=>setDeleteConfirm(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button><button onClick={()=>handleDelete(deleteConfirm)} className="px-4 py-2 bg-danger text-white rounded-lg hover:bg-red-600">Delete</button></div></motion.div></motion.div>}</AnimatePresence>
        </div>
    );
};

export default Subscriptions;
