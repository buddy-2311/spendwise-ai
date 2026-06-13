import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, generateNotifications } from '../services/notificationService';
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const priorityColors = { High:'border-l-red-500 bg-red-50', Medium:'border-l-yellow-500 bg-yellow-50', Low:'border-l-blue-500 bg-blue-50' };
const typeIcons = { Budget:'💰', Subscription:'🔄', Goal:'🎯', Expense:'💸', Prediction:'📊', System:'🔔' };

const Notifications = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            await generateNotifications(user.token);
            const { data } = await getNotifications(user.token);
            setNotifications(data);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleMarkRead = async (id) => {
        try { await markAsRead(user.token, id); setNotifications(n => n.map(x => x._id === id ? {...x, isRead: true} : x)); }
        catch { toast.error('Failed'); }
    };

    const handleMarkAllRead = async () => {
        try { await markAllAsRead(user.token); setNotifications(n => n.map(x => ({...x, isRead: true}))); toast.success('All marked as read'); }
        catch { toast.error('Failed'); }
    };

    const handleDelete = async (id) => {
        try { await deleteNotification(user.token, id); setNotifications(n => n.filter(x => x._id !== id)); toast.success('Deleted'); }
        catch { toast.error('Failed'); }
    };

    const timeAgo = (date) => {
        const diff = (Date.now() - new Date(date)) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
        return `${Math.floor(diff/86400)}d ago`;
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    if (loading) return <div className="space-y-4">{[1,2,3,4].map(i=><div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse"/>)}</div>;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-gray-800">Notifications</h1><p className="text-gray-500 text-sm mt-1">{unreadCount} unread</p></div>
                {unreadCount > 0 && <button onClick={handleMarkAllRead} className="flex items-center space-x-2 text-primary hover:text-primary/80 text-sm"><CheckCheck size={16}/><span>Mark all read</span></button>}
            </div>

            {notifications.length > 0 ? (
                <div className="space-y-3">
                    {notifications.map((n, i) => (
                        <motion.div key={n._id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}} className={`glass-card p-4 border-l-4 ${priorityColors[n.priority]||priorityColors.Low} ${!n.isRead ? 'ring-1 ring-primary/20' : 'opacity-75'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span>{typeIcons[n.type]||'🔔'}</span>
                                        <h4 className="font-semibold text-gray-800 text-sm">{n.title}</h4>
                                        {!n.isRead && <span className="w-2 h-2 bg-primary rounded-full"/>}
                                    </div>
                                    <p className="text-sm text-gray-600">{n.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                                </div>
                                <div className="flex items-center space-x-2 ml-3">
                                    {!n.isRead && <button onClick={()=>handleMarkRead(n._id)} className="text-gray-400 hover:text-primary" title="Mark read"><Check size={16}/></button>}
                                    {n.actionLink && <button onClick={()=>navigate(n.actionLink)} className="text-gray-400 hover:text-primary" title="View"><ExternalLink size={16}/></button>}
                                    <button onClick={()=>handleDelete(n._id)} className="text-gray-400 hover:text-danger" title="Delete"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="glass-card p-12 text-center"><Bell size={48} className="mx-auto text-gray-300 mb-4"/><p className="text-gray-500">No notifications</p></div>
            )}
        </div>
    );
};

export default Notifications;
