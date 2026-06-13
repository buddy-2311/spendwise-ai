import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell, Search, X, Menu, DollarSign, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, generateNotifications } from '../services/notificationService';

const Topbar = ({ onMenuClick }) => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [balance, setBalance] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const [expRes, incRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/expenses', config),
                    axios.get('http://localhost:5000/api/income', config)
                ]);
                const totalExpense = expRes.data.reduce((s, e) => s + e.amount, 0);
                const totalIncome = incRes.data.reduce((s, e) => s + e.amount, 0);
                setBalance(totalIncome - totalExpense);
            } catch { /* ignore */ }
        };
        fetchBalance();
        const interval = setInterval(fetchBalance, 30000);
        return () => clearInterval(interval);
    }, [user.token]);

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                await generateNotifications(user.token);
                const { data } = await getUnreadCount(user.token);
                setUnread(data.count);
            } catch { /* ignore */ }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 60000);
        return () => clearInterval(interval);
    }, [user.token]);

    useEffect(() => {
        const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggleDropdown = async () => {
        if (!showDropdown) {
            try { const { data } = await getNotifications(user.token); setNotifications(data.slice(0, 8)); } catch { /* ignore */ }
        }
        setShowDropdown(!showDropdown);
    };

    const handleMarkRead = async (id) => {
        try { await markAsRead(user.token, id); setNotifications(n => n.map(x => x._id === id ? {...x, isRead: true} : x)); setUnread(u => Math.max(0, u - 1)); } catch { /* */ }
    };

    const handleMarkAllRead = async () => {
        try { await markAllAsRead(user.token); setNotifications(n => n.map(x => ({...x, isRead: true}))); setUnread(0); } catch { /* */ }
    };

    const timeAgo = (date) => {
        const diff = (Date.now() - new Date(date)) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff/60)}m`;
        if (diff < 86400) return `${Math.floor(diff/3600)}h`;
        return `${Math.floor(diff/86400)}d`;
    };

    const typeIcons = { Budget:'💰', Subscription:'🔄', Goal:'🎯', Expense:'💸', Prediction:'📊', System:'🔔' };

    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const handleLogoutConfirm = () => {
        setShowLogoutConfirm(false);
        logout();
    };

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-10">
            <div className="flex items-center space-x-3">
                <button onClick={onMenuClick} className="md:hidden text-gray-500 hover:text-gray-700">
                    <Menu size={20} />
                </button>
                <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 w-36 md:w-96">
                <Search size={18} className="text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search transactions..." 
                    className="bg-transparent border-none outline-none ml-2 w-full text-sm placeholder-gray-500"
                />
            </div>
            </div>
            <div className="flex items-center space-x-1 md:space-x-4">
                {/* Balance + Date Badge - visible on all screens */}
                <div className="hidden sm:flex items-center space-x-1.5 bg-gradient-to-r from-primary/10 to-secondary/10 px-3 py-1.5 rounded-full border border-primary/20">
                    <DollarSign size={14} className="text-primary" />
                    <span className="text-xs font-semibold text-gray-700">Bal:</span>
                    <span className={`text-xs font-bold ${balance !== null ? (balance >= 0 ? 'text-success' : 'text-danger') : 'text-gray-400'}`}>
                        {balance !== null ? `₹${balance.toLocaleString()}` : '...'}
                    </span>
                    <span className="text-gray-300 mx-1">|</span>
                    <Calendar size={12} className="text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">
                        {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                </div>
                {/* Mobile-only compact balance + date */}
                <div className="sm:hidden flex flex-col items-end">
                    <span className={`text-xs font-bold ${balance !== null ? (balance >= 0 ? 'text-success' : 'text-danger') : 'text-gray-400'}`}>
                        {balance !== null ? `₹${balance.toLocaleString()}` : ''}
                    </span>
                    <span className="text-[10px] text-gray-500">
                        {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                </div>
                <div className="relative" ref={dropdownRef}>
                    <button onClick={toggleDropdown} className="text-gray-500 hover:text-primary transition-colors relative">
                        <Bell size={20} />
                        {unread > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {unread > 9 ? '9+' : unread}
                            </span>
                        )}
                    </button>
                    {showDropdown && (
                        <div className="absolute right-0 top-10 w-72 md:w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                            <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                                <h4 className="font-semibold text-sm">Notifications</h4>
                                <div className="flex items-center space-x-3">
                                    {unread > 0 && <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">Mark all read</button>}
                                    <button onClick={() => { setShowDropdown(false); navigate('/notifications'); }} className="text-xs text-primary hover:underline">View all</button>
                                </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length > 0 ? notifications.map(n => (
                                    <div key={n._id} onClick={() => { handleMarkRead(n._id); if (n.actionLink) { navigate(n.actionLink); setShowDropdown(false); } }} className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}>
                                        <div className="flex items-start space-x-2">
                                            <span className="text-sm mt-0.5">{typeIcons[n.type]||'🔔'}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                                                <p className="text-xs text-gray-500 truncate">{n.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                                            </div>
                                            {!n.isRead && <span className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"/>}
                                        </div>
                                    </div>
                                )) : <div className="p-6 text-center text-sm text-gray-400">No notifications</div>}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-2 md:space-x-3 pl-3 md:pl-4 border-l border-gray-200">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center font-bold text-sm">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700 hidden md:block">{user?.name}</span>
                    <button onClick={handleLogoutClick} className="text-gray-400 hover:text-danger ml-1 md:ml-2 transition-colors" title="Logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showLogoutConfirm && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
                        <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
                                <LogOut size={28} className="text-danger" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Logout?</h3>
                            <p className="text-sm text-gray-500 mb-6">Are you sure you want to logout?</p>
                            <div className="flex justify-center space-x-3">
                                <button onClick={() => setShowLogoutConfirm(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">Cancel</button>
                                <button onClick={handleLogoutConfirm} className="px-6 py-2.5 bg-danger text-white rounded-lg hover:bg-red-600 transition-colors font-medium">Logout</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Topbar;
