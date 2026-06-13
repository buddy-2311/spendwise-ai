import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', confirmColor = 'danger', icon = 'trash' }) => {
    if (!isOpen) return null;

    const IconComponent = icon === 'warning' ? AlertTriangle : Trash2;
    const iconColorClass = confirmColor === 'danger' ? 'text-red-500' : 'text-yellow-500';
    const iconBgClass = confirmColor === 'danger' ? 'bg-red-50' : 'bg-yellow-50';
    const btnClass = confirmColor === 'danger'
        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
        : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.85, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.85, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-end">
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex flex-col items-center text-center">
                        <div className={`w-16 h-16 rounded-full ${iconBgClass} flex items-center justify-center mb-4`}>
                            <IconComponent size={32} className={iconColorClass} />
                        </div>

                        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>

                        <div className="flex w-full space-x-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { onConfirm(); onClose(); }}
                                className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-all shadow-lg ${btnClass}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ConfirmModal;
