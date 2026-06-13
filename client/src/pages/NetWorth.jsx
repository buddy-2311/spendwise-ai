import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getNetWorthItems, getNetWorthSummary, getNetWorthHistory, createNetWorthItem, updateNetWorthItem, deleteNetWorthItem } from '../services/netWorthService';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, Edit3, TrendingUp, TrendingDown, DollarSign, Landmark, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const COLORS = ['#4F46E5','#8B5CF6','#F59E0B','#10B981','#EF4444','#3B82F6','#EC4899','#14B8A6'];
const ASSET_CATS = ['Cash','Bank Balance','Investments','Gold','Property','Vehicle','Business','Other Asset'];
const LIAB_CATS = ['Loan','Credit Card Due','EMI Balance','Borrowed Money','Mortgage','Education Loan','Vehicle Loan','Other Liability'];
const statusColors = { Positive:'text-success', Negative:'text-danger', Neutral:'text-gray-500' };

const NetWorth = () => {
    const { user } = useContext(AuthContext);
    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [form, setForm] = useState({ type:'Asset', category:'Cash', name:'', amount:'', note:'', date:new Date().toISOString().slice(0,10) });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [itemsRes, sumRes, histRes] = await Promise.all([getNetWorthItems(user.token, filter), getNetWorthSummary(user.token), getNetWorthHistory(user.token)]);
            setItems(itemsRes.data); setSummary(sumRes.data); setHistory(histRes.data);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [filter]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editItem) { await updateNetWorthItem(user.token, editItem._id, {...form, amount: Number(form.amount)}); toast.success('Updated'); }
            else { await createNetWorthItem(user.token, {...form, amount: Number(form.amount)}); toast.success('Added'); }
            setShowModal(false); setEditItem(null); resetForm(); fetchData();
        } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    };

    const handleDelete = async (id) => {
        try { await deleteNetWorthItem(user.token, id); toast.success('Deleted'); setDeleteConfirm(null); fetchData(); }
        catch { toast.error('Failed'); }
    };

    const resetForm = () => setForm({ type:'Asset', category:'Cash', name:'', amount:'', note:'', date:new Date().toISOString().slice(0,10) });

    const assetData = summary?.assetBreakdown ? Object.entries(summary.assetBreakdown).map(([name,value])=>({name,value})) : [];
    const liabData = summary?.liabilityBreakdown ? Object.entries(summary.liabilityBreakdown).map(([name,value])=>({name,value})) : [];

    if (loading) return <div className="space-y-6"><div className="h-8 bg-gray-200 rounded animate-pulse w-48"/><div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse"/>)}</div></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Net Worth</h1>
                    <p className="text-gray-500 text-sm mt-1">Track your assets and liabilities</p>
                    <div className="mt-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <p className="text-xs text-gray-600"><strong>Net Worth = Total Assets - Total Liabilities</strong></p>
                        <p className="text-xs text-gray-500 mt-1">Assets: Cash, Bank balance, Savings, Investments, Property, Vehicle value. Liabilities: Loan, Credit card debt, Mortgage, Borrowed money.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select value={filter} onChange={e=>setFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="">All</option><option value="Asset">Assets</option><option value="Liability">Liabilities</option></select>
                    <button onClick={()=>{setEditItem(null);resetForm();setShowModal(true);}} className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 text-sm"><Plus size={16}/><span>Add Item</span></button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="glass-card p-5 flex items-center justify-between"><div><p className="text-sm text-gray-500">Total Assets</p><h3 className="text-xl font-bold text-success mt-1">₹{(summary?.totalAssets||0).toLocaleString()}</h3></div><div className="w-11 h-11 rounded-full bg-success/10 flex items-center justify-center text-success"><TrendingUp size={22}/></div></motion.div>
                <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="glass-card p-5 flex items-center justify-between"><div><p className="text-sm text-gray-500">Total Liabilities</p><h3 className="text-xl font-bold text-danger mt-1">₹{(summary?.totalLiabilities||0).toLocaleString()}</h3></div><div className="w-11 h-11 rounded-full bg-danger/10 flex items-center justify-center text-danger"><TrendingDown size={22}/></div></motion.div>
                <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="glass-card p-5 flex items-center justify-between"><div><p className="text-sm text-gray-500">Net Worth</p><h3 className={`text-xl font-bold mt-1 ${statusColors[summary?.status]||''}`}>₹{(summary?.netWorth||0).toLocaleString()}</h3></div><div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary"><DollarSign size={22}/></div></motion.div>
                <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="glass-card p-5 flex items-center justify-between"><div><p className="text-sm text-gray-500">Status</p><h3 className="text-xl font-bold mt-1">{summary?.status||'N/A'}</h3></div><div className="w-11 h-11 rounded-full bg-secondary/10 flex items-center justify-center text-secondary"><Landmark size={22}/></div></motion.div>
            </div>

            {summary?.insights?.length > 0 && <div className="glass-card p-5 bg-gradient-to-br from-primary/5 to-secondary/5"><h3 className="text-sm font-semibold text-primary mb-3">💡 AI Insights</h3><div className="space-y-2">{summary.insights.map((s,i)=><div key={i} className="bg-white p-3 rounded-lg text-sm text-gray-700 border-l-4 border-secondary">{s}</div>)}</div></div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {items.length > 0 ? items.map((item,i)=>(
                        <motion.div key={item._id} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}} className="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                            <div className="mb-2 sm:mb-0">
                                <div className="flex items-center space-x-2 flex-wrap"><h4 className="font-semibold text-gray-800">{item.name}</h4><span className={`text-xs px-2 py-0.5 rounded-full ${item.type==='Asset'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{item.type}</span></div>
                                <p className="text-sm text-gray-500 mt-1">{item.category} · ₹{item.amount.toLocaleString()} {item.note && `· ${item.note}`}</p>
                            </div>
                            <div className="flex items-center space-x-2 self-end sm:self-auto">
                                <button onClick={()=>{setEditItem(item);setForm({type:item.type,category:item.category,name:item.name,amount:item.amount,note:item.note||'',date:item.date?.slice(0,10)||''});setShowModal(true);}} className="text-gray-400 hover:text-primary"><Edit3 size={16}/></button>
                                <button onClick={()=>setDeleteConfirm(item._id)} className="text-gray-400 hover:text-danger"><Trash2 size={16}/></button>
                            </div>
                        </motion.div>
                    )) : <div className="glass-card p-12 text-center"><Landmark size={48} className="mx-auto text-gray-300 mb-4"/><p className="text-gray-500">No items yet</p></div>}
                </div>
                <div className="space-y-6">
                    {assetData.length>0&&<div className="glass-card p-5"><h3 className="text-sm font-semibold mb-3">Asset Allocation</h3><div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={assetData} innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">{assetData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><RTooltip formatter={v=>`₹${v.toLocaleString()}`}/></PieChart></ResponsiveContainer></div><div className="mt-2 space-y-1">{assetData.map((d,i)=><div key={d.name} className="flex items-center justify-between text-xs"><div className="flex items-center space-x-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:COLORS[i%COLORS.length]}}/><span className="text-gray-600">{d.name}</span></div><span>₹{d.value.toLocaleString()}</span></div>)}</div></div>}
                    {liabData.length>0&&<div className="glass-card p-5"><h3 className="text-sm font-semibold mb-3">Liability Distribution</h3><div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={liabData} innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">{liabData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><RTooltip formatter={v=>`₹${v.toLocaleString()}`}/></PieChart></ResponsiveContainer></div></div>}
                </div>
            </div>

            {history.length>0&&<div className="glass-card p-5"><h3 className="text-lg font-semibold mb-4">Net Worth History</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={history}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><RTooltip formatter={v=>`₹${v.toLocaleString()}`}/><Line type="monotone" dataKey="netWorth" stroke="#4F46E5" strokeWidth={2}/><Line type="monotone" dataKey="assets" stroke="#22C55E" strokeWidth={1} strokeDasharray="5 5"/><Line type="monotone" dataKey="liabilities" stroke="#EF4444" strokeWidth={1} strokeDasharray="5 5"/></LineChart></ResponsiveContainer></div></div>}

            <AnimatePresence>{showModal&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{editItem?'Edit':'Add'} Item</h2><button onClick={()=>{setShowModal(false);setEditItem(null);}} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value,category:e.target.value==='Asset'?'Cash':'Loan'})} className="w-full px-3 py-2 border rounded-lg"><option>Asset</option><option>Liability</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full px-3 py-2 border rounded-lg">{(form.type==='Asset'?ASSET_CATS:LIAB_CATS).map(c=><option key={c}>{c}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Savings Account"/></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label><input type="number" required min="1" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"/></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Note</label><input type="text" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div>
                    <div className="flex justify-end space-x-3 mt-4"><button type="button" onClick={()=>{setShowModal(false);setEditItem(null);}} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">{editItem?'Update':'Add'}</button></div>
                </form>
            </motion.div></motion.div>}</AnimatePresence>

            <AnimatePresence>{deleteConfirm&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center"><Trash2 size={40} className="mx-auto text-danger mb-3"/><h3 className="text-lg font-bold mb-2">Delete Item?</h3><div className="flex justify-center space-x-3"><button onClick={()=>setDeleteConfirm(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button><button onClick={()=>handleDelete(deleteConfirm)} className="px-4 py-2 bg-danger text-white rounded-lg hover:bg-red-600">Delete</button></div></motion.div></motion.div>}</AnimatePresence>
        </div>
    );
};

export default NetWorth;
