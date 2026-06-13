import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { predictNextMonth } from '../services/predictionService';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const COLORS = ['#4F46E5','#8B5CF6','#F59E0B','#10B981','#EF4444','#3B82F6','#EC4899','#14B8A6','#F97316'];
const riskColors = { Low:'bg-green-100 text-green-700', Medium:'bg-yellow-100 text-yellow-700', High:'bg-red-100 text-red-700' };

const Predictions = () => {
    const { user } = useContext(AuthContext);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try { setLoading(true); const { data: r } = await predictNextMonth(user.token); setData(r); }
            catch { toast.error('Failed to load predictions'); }
            finally { setLoading(false); }
        })();
    }, [user.token]);

    const catData = data?.categoryPredictions ? Object.entries(data.categoryPredictions).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value) : [];

    if (loading) return <div className="space-y-6"><div className="h-8 bg-gray-200 rounded animate-pulse w-48"/><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i=><div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse"/>)}</div></div>;

    return (
        <div className="space-y-6">
            <div><h1 className="text-2xl font-bold text-gray-800">Expense Predictions</h1><p className="text-gray-500 text-sm mt-1">AI-powered spending forecast</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    {label:'Predicted Expense',val:`₹${(data?.predictedExpense||0).toLocaleString()}`,cls:'text-danger'},
                    {label:'Expected Savings',val:`₹${(data?.expectedSavings||0).toLocaleString()}`,cls:'text-success'},
                    {label:'Highest Risk',val:data?.highestCategory?.name||'N/A',sub:`₹${(data?.highestCategory?.amount||0).toLocaleString()}`},
                    {label:'Fixed Expenses',val:`₹${(data?.recurringTotal||0).toLocaleString()}`},
                    {label:'Trend',val:data?.trend||'Stable',badge:true}
                ].map((c,i)=>(
                    <motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}} className="glass-card p-5">
                        <p className="text-sm text-gray-500">{c.label}</p>
                        {c.badge ? <><div className="flex items-center space-x-2 mt-1">{c.val==='Increasing'?<TrendingUp size={18} className="text-red-500"/>:c.val==='Decreasing'?<TrendingDown size={18} className="text-green-500"/>:<Activity size={18} className="text-blue-500"/>}<span className="font-bold">{c.val}</span></div><span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${riskColors[data?.riskLevel]||riskColors.Low}`}>{data?.riskLevel||'Low'} Risk</span></> : <h3 className={`text-xl font-bold mt-1 ${c.cls||''}`}>{c.val}</h3>}
                        {c.sub && <p className="text-xs text-gray-400">{c.sub}</p>}
                    </motion.div>
                ))}
            </div>
            {data?.insights?.length > 0 && <div className="glass-card p-5 bg-gradient-to-br from-primary/5 to-secondary/5"><div className="flex items-center space-x-2 mb-3"><Sparkles size={18} className="text-primary"/><h3 className="text-sm font-semibold text-primary">AI Prediction Insights</h3></div><div className="space-y-2">{data.insights.map((s,i)=><div key={i} className="bg-white p-3 rounded-lg text-sm text-gray-700 border-l-4 border-secondary">{s}</div>)}</div></div>}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-5"><h3 className="text-lg font-semibold mb-4">Monthly Expense Trend</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data?.trendData||[]}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><RTooltip formatter={v=>`₹${v.toLocaleString()}`}/><Line type="monotone" dataKey="expense" stroke="#4F46E5" strokeWidth={2} dot={{r:4}}/></LineChart></ResponsiveContainer></div></div>
                <div className="glass-card p-5"><h3 className="text-lg font-semibold mb-4">Predicted vs Actual</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.actualVsPredicted||[]}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><RTooltip formatter={v=>`₹${v.toLocaleString()}`}/><Legend/><Bar dataKey="actual" fill="#4F46E5" radius={[4,4,0,0]} name="Actual"/><Bar dataKey="predicted" fill="#8B5CF6" radius={[4,4,0,0]} name="Predicted"/></BarChart></ResponsiveContainer></div></div>
                <div className="glass-card p-5 lg:col-span-2"><h3 className="text-lg font-semibold mb-4">Category Prediction</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={catData} innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">{catData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><RTooltip formatter={v=>`₹${v.toLocaleString()}`}/></PieChart></ResponsiveContainer></div><div className="space-y-2">{catData.map((d,i)=><div key={d.name} className="flex items-center justify-between text-sm py-1"><div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor:COLORS[i%COLORS.length]}}/><span className="text-gray-600">{d.name}</span></div><span className="font-medium">₹{d.value.toLocaleString()}</span></div>)}</div></div></div>
            </div>
        </div>
    );
};

export default Predictions;
