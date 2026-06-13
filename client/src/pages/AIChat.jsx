import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { sendMessage, getChatHistory, clearChatHistory } from '../services/aiChatService';
import { Send, Trash2, Sparkles, User, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
    'Food spending this month', 'Can I afford a trip?', 'Show my highest expenses',
    'How much can I save?', 'Subscription summary', 'Net worth summary',
    'Spending risk', 'What are my goals?', 'Income this month',
    'Can I afford my goal this month?', 'Net worth meaning', 'How can I save more?'
];

const AIChat = () => {
    const { user } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        (async () => {
            try { const { data } = await getChatHistory(user.token); setMessages(data); }
            catch { /* empty history is fine */ }
        })();
    }, [user.token]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async (text) => {
        const msg = text || input.trim();
        if (!msg) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', message: msg, createdAt: new Date() }]);
        setSending(true);
        try {
            const { data } = await sendMessage(user.token, msg);
            setMessages(prev => [...prev, { role: 'assistant', message: data.response, createdAt: new Date() }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', message: 'Sorry, something went wrong. Please try again.', createdAt: new Date() }]);
        } finally { setSending(false); }
    };

    const handleClear = async () => {
        try { await clearChatHistory(user.token); setMessages([]); toast.success('Chat cleared'); }
        catch { toast.error('Failed'); }
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">AI Chat Assistant</h1>
                    <p className="text-gray-500 text-sm">Ask questions about your finances</p>
                </div>
                {messages.length > 0 && (
                    <button onClick={handleClear} className="flex items-center space-x-2 text-gray-500 hover:text-danger text-sm">
                        <Trash2 size={16}/><span>Clear Chat</span>
                    </button>
                )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {messages.length === 0 && (
                    <div className="text-center py-12">
                        <Sparkles size={48} className="mx-auto text-primary/30 mb-4"/>
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">How can I help you today?</h3>
                        <p className="text-sm text-gray-400 mb-6">Ask me about your expenses, budgets, savings, or any financial question.</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {SUGGESTIONS.map(s => (
                                <button key={s} onClick={() => handleSend(s)} className="px-3 py-1.5 bg-primary/5 text-primary text-sm rounded-full hover:bg-primary/10 transition-colors border border-primary/20">
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start space-x-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-gradient-to-br from-primary/20 to-secondary/20 text-primary'}`}>
                                {msg.role === 'user' ? <User size={16}/> : <Bot size={16}/>}
                            </div>
                            <div className={`p-3 rounded-2xl text-sm whitespace-pre-line ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-sm' : 'glass-card rounded-tl-sm text-gray-700'}`}>
                                {msg.message}
                            </div>
                        </div>
                    </motion.div>
                ))}

                {sending && (
                    <div className="flex justify-start">
                        <div className="flex items-start space-x-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary"><Bot size={16}/></div>
                            <div className="glass-card p-3 rounded-2xl rounded-tl-sm">
                                <div className="flex space-x-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"/><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}/><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}/></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef}/>
            </div>

            {/* Suggestion Chips (when there are messages) */}
            {messages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {SUGGESTIONS.slice(0, 4).map(s => (
                        <button key={s} onClick={() => handleSend(s)} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-gray-200 transition-colors">{s}</button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="glass-card p-3 flex items-center space-x-3">
                <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about your finances..." className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400" disabled={sending}/>
                <button onClick={() => handleSend()} disabled={sending || !input.trim()} className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Send size={16}/>
                </button>
            </div>
        </div>
    );
};

export default AIChat;
