import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, X, AlertTriangle, Check, Minus, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const BudgetBalanceModal = ({ isOpen, onClose, overspentLimit, suggestions, onApply, canFullyBalance, shortfall }) => {
    const [adjustments, setAdjustments] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (suggestions && suggestions.length > 0) {
            setAdjustments(suggestions.map(s => ({
                category: s.category,
                currentLimit: s.currentLimit,
                currentSpent: s.currentSpent,
                availableToReduce: s.availableToReduce,
                reductionAmount: s.suggestedReduction,
                newLimit: s.newLimit
            })));
        }
    }, [suggestions]);

    if (!isOpen || !overspentLimit) return null;

    const extraAmount = overspentLimit.currentSpent - overspentLimit.currentLimit;
    const totalReduction = adjustments.reduce((sum, a) => sum + a.reductionAmount, 0);
    const isFullyCovered = totalReduction >= extraAmount;

    const handleReductionChange = (index, value) => {
        const numVal = Math.max(0, Math.min(Number(value) || 0, adjustments[index].availableToReduce));
        const updated = [...adjustments];
        updated[index] = {
            ...updated[index],
            reductionAmount: numVal,
            newLimit: updated[index].currentLimit - numVal
        };
        setAdjustments(updated);
    };

    const handleApply = async () => {
        const validAdjustments = adjustments.filter(a => a.reductionAmount > 0);
        if (validAdjustments.length === 0) {
            toast.error('Please set at least one reduction amount');
            return;
        }
        setLoading(true);
        try {
            await onApply(validAdjustments.map(a => ({
                category: a.category,
                reductionAmount: a.reductionAmount
            })));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 30 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                <Scale size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">Balance Overspent Limit</h2>
                                <p className="text-xs text-gray-500">Redistribute limit across categories</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        {/* Overspent Summary */}
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <AlertTriangle size={18} className="text-red-500" />
                                <h3 className="font-semibold text-red-700">{overspentLimit.overspentCategory} Overspending</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div className="bg-white/80 rounded-lg p-2.5 text-center">
                                    <p className="text-gray-500 text-xs mb-1">Limit</p>
                                    <p className="font-bold text-gray-800">₹{overspentLimit.currentLimit?.toLocaleString()}</p>
                                </div>
                                <div className="bg-white/80 rounded-lg p-2.5 text-center">
                                    <p className="text-gray-500 text-xs mb-1">Spent</p>
                                    <p className="font-bold text-red-600">₹{overspentLimit.currentSpent?.toLocaleString()}</p>
                                </div>
                                <div className="bg-white/80 rounded-lg p-2.5 text-center">
                                    <p className="text-gray-500 text-xs mb-1">Extra</p>
                                    <p className="font-bold text-red-600">₹{extraAmount.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Not enough limit warning */}
                        {!canFullyBalance && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start space-x-2">
                                <AlertTriangle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-yellow-700">
                                    Not enough available limit to fully balance this overspending. Shortfall: <strong>₹{shortfall?.toLocaleString()}</strong>
                                </p>
                            </div>
                        )}

                        {/* Adjustments */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Suggested Adjustments</h3>
                            <div className="space-y-3">
                                {adjustments.map((adj, idx) => (
                                    <motion.div
                                        key={adj.category}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-gray-50 border border-gray-100 rounded-xl p-4"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <Minus size={14} className="text-orange-500" />
                                                <span className="font-medium text-gray-800 text-sm">{adj.category}</span>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                Available: ₹{adj.availableToReduce?.toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="flex items-center space-x-3">
                                            <div className="flex-1 flex items-center space-x-2 text-sm">
                                                <span className="text-gray-500 whitespace-nowrap">₹{adj.currentLimit?.toLocaleString()}</span>
                                                <ChevronRight size={14} className="text-gray-400" />
                                                <span className={`font-semibold whitespace-nowrap ${adj.reductionAmount > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                                                    ₹{adj.newLimit?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <span className="text-xs text-gray-500">-₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={adj.availableToReduce}
                                                    value={adj.reductionAmount}
                                                    onChange={e => handleReductionChange(idx, e.target.value)}
                                                    className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-center font-medium"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                {adjustments.length === 0 && (
                                    <div className="text-center py-6 text-gray-500 text-sm">
                                        No categories available for reduction
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className={`rounded-xl p-4 border ${isFullyCovered ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    {isFullyCovered ? (
                                        <Check size={16} className="text-green-600" />
                                    ) : (
                                        <AlertTriangle size={16} className="text-yellow-600" />
                                    )}
                                    <span className={`text-sm font-medium ${isFullyCovered ? 'text-green-700' : 'text-yellow-700'}`}>
                                        {isFullyCovered ? 'Fully Covered' : 'Partially Covered'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-800">
                                        ₹{totalReduction.toLocaleString()} / ₹{extraAmount.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={loading || totalReduction === 0}
                            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Scale size={16} />
                            )}
                            <span>{loading ? 'Applying...' : 'Apply Balance'}</span>
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default BudgetBalanceModal;
