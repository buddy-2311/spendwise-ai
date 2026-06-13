import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getSpendingLimitSummary, createSpendingLimit, updateSpendingLimit, deleteSpendingLimit, recalculateSpendingLimits, getBalanceSuggestions, applyBudgetBalance } from '../services/spendingLimitService';
import { Plus, Trash2, Edit3, Shield, AlertTriangle, X, RefreshCw, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import BudgetBalanceModal from '../components/limits/BudgetBalanceModal';

const CATEGORIES = ['Food','Travel','Shopping','Bills','Education','Rent','Subscriptions','Healthcare','Entertainment','Savings','Others'];

const getStatus = (pct) => {
    if (pct >= 100) return { label:'Exceeded', cls:'bg-red-100 text-red-700' };
    if (pct >= 90) return { label:'Danger', cls:'bg-orange-100 text-orange-700' };
    if (pct >= 70) return { label:'Warning', cls:'bg-yellow-100 text-yellow-700' };
    return { label:'Safe', cls:'bg-green-100 text-green-700' };
};

const SpendingLimits = () => {
    const { user } = useContext(AuthContext);
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth()+1);
    const [year, setYear] = useState(now.getFullYear());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editLimit, setEditLimit] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [form, setForm] = useState({ category:'Food', monthlyLimit:'', alertAt70:true, alertAt90:true, alertAt100:true });

    // Budget Balance state
    const [showBalanceModal, setShowBalanceModal] = useState(false);
    const [balanceSuggestions, setBalanceSuggestions] = useState(null);
    const [balanceLoading, setBalanceLoading] = useState(false);

    const fetchData = async () => {
        try { setLoading(true); const { data:d } = await getSpendingLimitSummary(user.token, month, year); setData(d); }
        catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [month, year]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editLimit) { await updateSpendingLimit(user.token, editLimit._id, { monthlyLimit:Number(form.monthlyLimit), alertAt70:form.alertAt70, alertAt90:form.alertAt90, alertAt100:form.alertAt100 }); toast.success('Updated'); }
            else { await createSpendingLimit(user.token, { ...form, monthlyLimit:Number(form.monthlyLimit), month, year }); toast.success('Created'); }
            setShowModal(false); setEditLimit(null); setForm({ category:'Food', monthlyLimit:'', alertAt70:true, alertAt90:true, alertAt100:true }); fetchData();
        } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    };

    const handleDelete = async (id) => {
        try { await deleteSpendingLimit(user.token, id); toast.success('Deleted'); setDeleteConfirm(null); fetchData(); }
        catch { toast.error('Failed'); }
    };

    const handleRecalculate = async () => {
        try { await recalculateSpendingLimits(user.token, { month, year }); toast.success('Recalculated'); fetchData(); }
        catch { toast.error('Failed'); }
    };

    // Get exceeded limits
    const exceededLimits = data?.limits?.filter(l => l.usagePercentage >= 100) || [];

    // Handle balance budget click for a specific category
    const handleBalanceBudget = async (category) => {
        try {
            setBalanceLoading(true);
            const { data: suggestionData } = await getBalanceSuggestions(user.token, { overspentCategory: category, month, year });
            setBalanceSuggestions(suggestionData);
            setShowBalanceModal(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to get suggestions');
        } finally {
            setBalanceLoading(false);
        }
    };

    // Apply budget balance
    const handleApplyBalance = async (adjustments) => {
        try {
            await applyBudgetBalance(user.token, {
                overspentCategory: balanceSuggestions.overspentCategory,
                adjustments,
                month,
                year
            });
            toast.success('Budget balanced successfully');
            setShowBalanceModal(false);
            setBalanceSuggestions(null);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to apply balance');
        }
    };

    if (loading) return <div className="space-y-6"><div className="h-8 bg-gray-200 rounded animate-pulse w-48"/><div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse"/>)}</div></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h1 className="text-2xl font-bold text-gray-800">Spending Limits</h1><p className="text-gray-500 text-sm mt-1">Set category-wise monthly spending caps</p></div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Date(2000,i).toLocaleString('default',{month:'long'})}</option>)}</select>
                    <select value={year} onChange={e=>setYear(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">{[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}</select>
                    <button onClick={handleRecalculate} className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 text-sm"><RefreshCw size={14}/><span>Recalculate</span></button>
                    <button onClick={()=>{setEditLimit(null);setForm({category:'Food',monthlyLimit:'',alertAt70:true,alertAt90:true,alertAt100:true});setShowModal(true);}} className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 text-sm"><Plus size={16}/><span>Add Limit</span></button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="glass-card p-5"><p className="text-sm text-gray-500">Total Categories</p><h3 className="text-xl font-bold mt-1">{data?.totalCategories||0}</h3></motion.div>
                <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="glass-card p-5"><p className="text-sm text-gray-500">Safe</p><h3 className="text-xl font-bold text-success mt-1">{data?.safeCount||0}</h3></motion.div>
                <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="glass-card p-5"><p className="text-sm text-gray-500">Warning / Danger</p><h3 className="text-xl font-bold text-yellow-600 mt-1">{(data?.warningCount||0)+(data?.dangerCount||0)}</h3></motion.div>
                <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="glass-card p-5"><p className="text-sm text-gray-500">Exceeded</p><h3 className="text-xl font-bold text-danger mt-1">{data?.exceededCount||0}</h3></motion.div>
            </div>

            {/* Overspending Warning Cards */}
            {exceededLimits.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                >
                    {exceededLimits.map(l => {
                        const extra = l.spentAmount - l.monthlyLimit;
                        return (
                            <div key={l._id} className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle size={20} className="text-red-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-red-700 text-sm">{l.category} exceeded its limit by ₹{extra.toLocaleString()}</p>
                                        <p className="text-xs text-red-500">Limit: ₹{l.monthlyLimit.toLocaleString()} • Spent: ₹{l.spentAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleBalanceBudget(l.category)}
                                    disabled={balanceLoading}
                                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-200 disabled:opacity-50 whitespace-nowrap"
                                >
                                    <Scale size={14} />
                                    <span>Balance Budget</span>
                                </button>
                            </div>
                        );
                    })}
                </motion.div>
            )}

            <div className="space-y-4">
                {data?.limits?.length > 0 ? data.limits.map((l,i) => {
                    const st = getStatus(l.usagePercentage);
                    return (
                        <motion.div key={l._id} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}} className="glass-card p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center space-x-3"><h4 className="font-semibold text-gray-800">{l.category}</h4><span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={()=>{setEditLimit(l);setForm({category:l.category,monthlyLimit:l.monthlyLimit,alertAt70:l.alertAt70,alertAt90:l.alertAt90,alertAt100:l.alertAt100});setShowModal(true);}} className="text-gray-400 hover:text-primary"><Edit3 size={16}/></button>
                                    <button onClick={()=>setDeleteConfirm(l._id)} className="text-gray-400 hover:text-danger"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                                <div><span className="text-gray-500">Limit</span><p className="font-semibold">₹{l.monthlyLimit.toLocaleString()}</p></div>
                                <div><span className="text-gray-500">Spent</span><p className="font-semibold text-danger">₹{l.spentAmount.toLocaleString()}</p></div>
                                <div><span className="text-gray-500">Remaining</span><p className="font-semibold text-success">₹{l.remainingAmount.toLocaleString()}</p></div>
                                <div><span className="text-gray-500">Alerts</span><p className="text-xs">{[l.alertAt70&&'70%',l.alertAt90&&'90%',l.alertAt100&&'100%'].filter(Boolean).join(', ')||'None'}</p></div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className={`h-2.5 rounded-full transition-all duration-500 ${l.usagePercentage>=100?'bg-red-500':l.usagePercentage>=70?'bg-yellow-500':'bg-green-500'}`} style={{width:`${Math.min(100,l.usagePercentage)}%`}}/>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 text-right">{l.usagePercentage}% used</p>
                        </motion.div>
                    );
                }) : <div className="glass-card p-12 text-center"><Shield size={48} className="mx-auto text-gray-300 mb-4"/><p className="text-gray-500">No spending limits set</p></div>}
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>{showModal&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{editLimit?'Edit':'Add'} Spending Limit</h2><button onClick={()=>{setShowModal(false);setEditLimit(null);}} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!editLimit&&<div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full px-3 py-2 border rounded-lg">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>}
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Monthly Limit (₹)</label><input type="number" required min="1" value={form.monthlyLimit} onChange={e=>setForm({...form,monthlyLimit:e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"/></div>
                    <div className="space-y-2"><p className="text-sm font-medium text-gray-700">Alert Thresholds</p>
                        {[{key:'alertAt70',label:'70%'},{key:'alertAt90',label:'90%'},{key:'alertAt100',label:'100%'}].map(a=><label key={a.key} className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={form[a.key]} onChange={e=>setForm({...form,[a.key]:e.target.checked})} className="accent-primary"/><span className="text-sm">Alert at {a.label}</span></label>)}
                    </div>
                    <div className="flex justify-end space-x-3 mt-4"><button type="button" onClick={()=>{setShowModal(false);setEditLimit(null);}} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">{editLimit?'Update':'Create'}</button></div>
                </form>
            </motion.div></motion.div>}</AnimatePresence>

            {/* Delete Confirm Modal */}
            <AnimatePresence>{deleteConfirm&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} className="text-red-500"/>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Spending Limit?</h3>
                <p className="text-sm text-gray-500 mb-5">Are you sure you want to delete this spending limit? This action cannot be undone.</p>
                <div className="flex justify-center space-x-3">
                    <button onClick={()=>setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">Cancel</button>
                    <button onClick={()=>handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-lg">Delete</button>
                </div>
            </motion.div></motion.div>}</AnimatePresence>

            {/* Budget Balance Modal */}
            {balanceSuggestions && (
                <BudgetBalanceModal
                    isOpen={showBalanceModal}
                    onClose={() => { setShowBalanceModal(false); setBalanceSuggestions(null); }}
                    overspentLimit={balanceSuggestions}
                    suggestions={balanceSuggestions.suggestions}
                    onApply={handleApplyBalance}
                    canFullyBalance={balanceSuggestions.canFullyBalance}
                    shortfall={balanceSuggestions.shortfall}
                />
            )}
        </div>
    );
};

export default SpendingLimits;
