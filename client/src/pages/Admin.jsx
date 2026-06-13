import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Users, FileText, Target, CreditCard, Wallet, Bell, Shield, Landmark, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const Admin = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState({});

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const { data } = await axios.get('http://localhost:5000/api/admin/stats', config);
                setStats(data);
            } catch (error) {
                console.error("Error fetching admin stats", error);
            }
        };
        fetchStats();
    }, [user.token]);

    const cards = [
        { label:'Total Users', val:stats.usersCount||0, icon:<Users size={24}/>, cls:'primary' },
        { label:'Active Users', val:stats.activeUsers||0, icon:<Users size={24}/>, cls:'success' },
        { label:'Total Transactions', val:stats.expensesCount||0, icon:<FileText size={24}/>, cls:'secondary' },
        { label:'Total Goals', val:stats.goalsCount||0, icon:<Target size={24}/>, cls:'primary' },
        { label:'Subscriptions', val:stats.subscriptionsCount||0, icon:<CreditCard size={24}/>, cls:'secondary' },
        { label:'Notifications', val:stats.notificationsCount||0, icon:<Bell size={24}/>, cls:'danger' },
        { label:'Spending Limits', val:stats.spendingLimitsCount||0, icon:<Shield size={24}/>, cls:'primary' },
        { label:'Avg Net Worth', val:`₹${(stats.avgNetWorth||0).toLocaleString()}`, icon:<Landmark size={24}/>, cls:'success' },
        { label:'Top Limit Category', val:stats.topLimitCategory||'N/A', icon:<Shield size={24}/>, cls:'secondary' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {cards.map((c, i) => (
                    <motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} className="glass-card p-5 flex items-center space-x-4">
                        <div className={`p-3 bg-${c.cls}/10 text-${c.cls} rounded-full`}>{c.icon}</div>
                        <div><p className="text-sm text-gray-500 font-medium">{c.label}</p><h3 className="text-xl font-bold">{c.val}</h3></div>
                    </motion.div>
                ))}
            </div>

            {stats.topQuestions?.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2"><MessageSquare size={20} className="text-primary"/><span>Top AI Chat Questions</span></h3>
                    <div className="space-y-2">
                        {stats.topQuestions.map((q, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-700">{q.question}</span>
                                <span className="text-sm font-medium text-primary">{q.count}x</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">System Settings</h3>
                <p className="text-gray-500">More admin controls will be added here in future updates.</p>
            </div>
        </div>
    );
};

export default Admin;
