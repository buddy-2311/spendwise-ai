import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, LineChart, Settings, ShieldAlert, Target, Wallet, TrendingUp, CreditCard, Landmark, Shield, MessageSquare, X } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ mobileOpen, onMobileClose }) => {
    const location = useLocation();
    const { user } = useContext(AuthContext);

    const navItems = [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Transactions', path: '/transactions', icon: <Receipt size={20} /> },
        { name: 'Spending Limits', path: '/spending-limits', icon: <Shield size={20} /> },
        { name: 'Predictions', path: '/predictions', icon: <TrendingUp size={20} /> },
        { name: 'Subscriptions', path: '/subscriptions', icon: <CreditCard size={20} /> },
        { name: 'Net Worth', path: '/net-worth', icon: <Landmark size={20} /> },
        { name: 'Future Planner', path: '/future-planner', icon: <Target size={20} /> },
        { name: 'Calculators', path: '/calculators', icon: <LineChart size={20} /> },

        { name: 'AI Chat', path: '/ai-chat', icon: <MessageSquare size={20} /> },
        { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
    ];

    if (user?.role === 'admin') {
        navItems.push({ name: 'Admin Panel', path: '/admin', icon: <ShieldAlert size={20} /> });
    }

    const sidebarContent = (
        <div className="flex flex-col h-full">
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                    SpendWise AI
                </span>
                {mobileOpen && (
                    <button onClick={onMobileClose} className="text-gray-400 hover:text-gray-600 md:hidden">
                        <X size={20} />
                    </button>
                )}
            </div>
            <div className="flex-1 py-4 px-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <Link
                        key={item.name}
                        to={item.path}
                        onClick={onMobileClose}
                        className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                            location.pathname === item.path
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        {item.icon}
                        <span className="text-sm">{item.name}</span>
                    </Link>
                ))}
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col h-full shadow-sm">
                {sidebarContent}
            </div>

            {/* Mobile sidebar overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 z-50 md:hidden">
                        <motion.div initial={{x:-280}} animate={{x:0}} exit={{x:-280}} transition={{type:'tween', duration:0.3}} className="w-64 bg-white h-full shadow-xl">
                            {sidebarContent}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Sidebar;
