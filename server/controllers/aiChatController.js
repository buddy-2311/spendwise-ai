const ChatMessage = require('../models/ChatMessage');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Budget = require('../models/Budget');
const SpendingLimit = require('../models/SpendingLimit');
const Subscription = require('../models/Subscription');
const Goal = require('../models/Goal');
const NetWorthItem = require('../models/NetWorthItem');
const RecurringExpense = require('../models/RecurringExpense');
const User = require('../models/User');

const processMessage = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === '') {
            return res.status(400).json({ message: 'Message cannot be empty' });
        }

        await new ChatMessage({ userId: req.user._id, role: 'user', message }).save();

        const lowerMsg = message.toLowerCase().trim();
        let response = '';

        const extractNumber = () => {
            const nums = message.match(/\d[\d,]*/g);
            if (nums) return parseInt(nums[0].replace(/,/g, ''), 10);
            return null;
        };

        const user = await User.findById(req.user._id);
        const currency = user.preferredCurrency || '₹';
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const startDate = new Date(currentYear, currentMonth - 1, 1);
        const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        const getExpenses = () => Expense.find({ userId: req.user._id, date: { $gte: startDate, $lte: endDate } });
        const getIncomes = () => Income.find({ userId: req.user._id, date: { $gte: startDate, $lte: endDate } });
        const getCategoryTotals = async () => {
            const exps = await getExpenses();
            const total = exps.reduce((s, e) => s + e.amount, 0);
            const byCat = {};
            exps.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
            return { exps, total, byCat };
        };

        const getEffectiveIncome = async () => {
            const incomes = await getIncomes();
            return user.monthlyIncome || incomes.reduce((s, i) => s + i.amount, 0) || 0;
        };

        const getTopCategory = (byCat) => {
            const entries = Object.entries(byCat);
            if (entries.length === 0) return null;
            return entries.sort((a, b) => b[1] - a[1])[0];
        };

        const incomeTip = user.monthlyIncome ? '' : ' 💡 Set your monthly income in Settings for more accurate advice.';

        // Priority conditions: check more specific patterns first

        // 1. Goal + afford (must come before generic 'afford')
        if (lowerMsg.includes('goal') && (lowerMsg.includes('afford') || lowerMsg.includes('possible') || lowerMsg.includes('feasible') || lowerMsg.includes('can i'))) {
            const goals = await Goal.find({ userId: req.user._id, status: 'Active' });
            const { total: totalExpense } = await getCategoryTotals();
            const monthlyIncome = await getEffectiveIncome();
            const available = monthlyIncome - totalExpense;

            if (goals.length > 0) {
                const nearest = goals.sort((a, b) => (a.targetAmount - a.currentAmount) - (b.targetAmount - b.currentAmount))[0];
                const needed = nearest.targetAmount - nearest.currentAmount;
                if (monthlyIncome > 0 && available >= needed) {
                    response = `Yes! You can likely afford your goal "${nearest.title}" this month.`;
                    response += ` You need ${currency}${needed.toLocaleString()} more, and you have ${currency}${available.toLocaleString()} available after expenses.`;
                } else if (monthlyIncome > 0) {
                    const shortfall = needed - available;
                    response = `Your goal "${nearest.title}" may not be possible this month.`;
                    response += ` You need ${currency}${needed.toLocaleString()} more but only have ${currency}${available.toLocaleString()} available.`;
                    response += ` Shortfall: ${currency}${shortfall.toLocaleString()}. Try reducing expenses or increasing income.`;
                } else {
                    response = `Your goal "${nearest.title}" needs ${currency}${needed.toLocaleString()} more. Your expenses are ${currency}${totalExpense.toLocaleString()} this month.`;
                    response += incomeTip;
                }
            } else {
                response = 'You don\'t have any active goals. Create one in the Future Planner first!';
            }

        // 2. Balance / leftover / remaining money
        } else if (lowerMsg.includes('balance') || lowerMsg.includes('leftover') || lowerMsg.includes('remaining money') || lowerMsg.includes('left this month') || (lowerMsg.includes('how much') && lowerMsg.includes('left'))) {
            const { total: totalExpense } = await getCategoryTotals();
            const monthlyIncome = await getEffectiveIncome();
            const balance = monthlyIncome - totalExpense;
            response = `Your current balance this month: ${currency}${balance.toLocaleString()}.`;
            response += ` Income: ${currency}${monthlyIncome.toLocaleString()}, Expenses: ${currency}${totalExpense.toLocaleString()}.`;
            if (monthlyIncome > 0) {
                if (balance > 0) {
                    response += ` You have ${currency}${balance.toLocaleString()} leftover. Consider saving or investing it.`;
                } else if (balance < 0) {
                    response += ` You're in the negative. Try to reduce expenses.`;
                }
            } else {
                response += ` You're spending ${currency}${totalExpense.toLocaleString()} but no income is recorded.`;
                response += incomeTip;
            }

        // 3. Trip / vacation affordability (but not about goals)
        } else if ((lowerMsg.includes('trip') || lowerMsg.includes('vacation') || lowerMsg.includes('holiday')) && !lowerMsg.includes('goal')) {
            const { total: totalExpense, byCat: categoryTotals } = await getCategoryTotals();
            const monthlyIncome = await getEffectiveIncome();
            const amount = extractNumber();

            if (monthlyIncome > 0) {
                const savings = monthlyIncome - totalExpense;
                if (savings > monthlyIncome * 0.3) {
                    response = `Your current savings this month are ${currency}${savings.toLocaleString()}. You can consider a modest trip. Keep at least 20% of income as savings before planning.`;
                } else if (savings > 0) {
                    response = `Your savings are ${currency}${savings.toLocaleString()} this month. It might be tight for a trip. Consider saving for 1-2 more months.`;
                } else {
                    response = `You've already spent more than your income this month. A trip is not advisable right now. Focus on reducing expenses first.`;
                }
            } else {
                const top = getTopCategory(categoryTotals);
                response = `Your expenses this month are ${currency}${totalExpense.toLocaleString()}.`;
                if (top) response += ` Your biggest spend is ${top[0]} (${currency}${top[1].toLocaleString()}).`;
                if (amount) {
                    response += ` A ${currency}${amount.toLocaleString()} trip would require cutting expenses significantly.`;
                }
                response += incomeTip;
            }

        // 4. General affordability (without goal or trip mention)
        } else if (lowerMsg.includes('afford') || lowerMsg.includes('can i buy') || lowerMsg.includes('can i purchase')) {
            const { total: totalExpense, byCat: categoryTotals } = await getCategoryTotals();
            const monthlyIncome = await getEffectiveIncome();
            const amount = extractNumber();

            if (monthlyIncome > 0) {
                const savings = monthlyIncome - totalExpense;
                response = `After your current expenses (${currency}${totalExpense.toLocaleString()}), you have ${currency}${Math.max(0, savings).toLocaleString()} available this month.`;
                if (savings > monthlyIncome * 0.2) {
                    response += ' You have room for discretionary spending.';
                } else if (savings > 0) {
                    response += ' Be careful with large purchases. Try to keep some savings.';
                } else {
                    response += ' Consider reducing expenses before making new purchases.';
                }
            } else {
                const top = getTopCategory(categoryTotals);
                response = `Your total expenses this month are ${currency}${totalExpense.toLocaleString()}.`;
                if (top) response += ` You're spending the most on ${top[0]} (${currency}${top[1].toLocaleString()}).`;
                if (amount) {
                    const currentBalance = -totalExpense;
                    response += ` To afford ${currency}${amount.toLocaleString()}, you'd need income above ${currency}${(totalExpense + amount).toLocaleString()}.`;
                }
                response += incomeTip;
            }

        // 5. Credit card / loan / debt
        } else if (lowerMsg.includes('credit card') || lowerMsg.includes('loan') || lowerMsg.includes('debt') || lowerMsg.includes('borrow') || lowerMsg.includes('emi')) {
            const items = await NetWorthItem.find({ userId: req.user._id, type: 'Liability' });
            const totalLiabilities = items.reduce((s, i) => s + i.amount, 0);
            if (items.length > 0) {
                response = `You have ${items.length} liabilities totaling ${currency}${totalLiabilities.toLocaleString()}.`;
                const loanItems = items.filter(i => i.category.toLowerCase().includes('loan') || i.category.toLowerCase().includes('credit'));
                if (loanItems.length > 0) {
                    response += ` This includes ${loanItems.length} loan/credit accounts.`;
                }
                response += ' Focus on paying high-interest debts first. Consider debt consolidation if rates are high.';
            } else {
                response = 'You don\'t have any liabilities recorded. That\'s great! If you have debt, add it in the Net Worth section to track it.';
            }

        // 6. Food / expenses / spending / highest / total spent
        } else if (lowerMsg.includes('food') || lowerMsg.includes('spend') || lowerMsg.includes('expense') || lowerMsg.includes('category') || lowerMsg.includes('highest') || lowerMsg.includes('spent') || lowerMsg.includes('cost') || lowerMsg.includes('total')) {
            const { total: totalExpense, byCat: categoryTotals } = await getCategoryTotals();

            if (lowerMsg.includes('food')) {
                const foodSpend = categoryTotals['Food'] || 0;
                response = `You have spent ${currency}${foodSpend.toLocaleString()} on Food this month out of total ${currency}${totalExpense.toLocaleString()} expenses.`;
                if (foodSpend > 0 && totalExpense > 0) {
                    const pct = Math.round((foodSpend / totalExpense) * 100);
                    response += ` Food is ${pct}% of your total spending.`;
                    if (pct > 30) response += ' Consider cooking more at home to reduce this.';
                }
            } else if (lowerMsg.includes('highest') || lowerMsg.includes('top') || lowerMsg.includes('most')) {
                const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);
                if (sorted.length > 0) {
                    response = `Your top spending categories this month:\n`;
                    sorted.forEach(([cat, amt], i) => {
                        response += `${i + 1}. ${cat}: ${currency}${amt.toLocaleString()}\n`;
                    });
                    response += `Total expenses: ${currency}${totalExpense.toLocaleString()}`;
                } else {
                    response = 'No expenses recorded this month yet.';
                }
            } else if (lowerMsg.includes('category') || lowerMsg.includes('categories')) {
                const entries = Object.entries(categoryTotals);
                if (entries.length > 0) {
                    response = `Your category-wise spending this month:\n`;
                    entries.sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
                        const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
                        response += `• ${cat}: ${currency}${amt.toLocaleString()} (${pct}%)\n`;
                    });
                    response += `Total: ${currency}${totalExpense.toLocaleString()}`;
                } else {
                    response = 'No expenses recorded this month yet.';
                }
            } else {
                response = `Your total expenses this month: ${currency}${totalExpense.toLocaleString()}.`;
                const entries = Object.entries(categoryTotals);
                if (entries.length > 0) {
                    response += ` Spending across ${entries.length} categories.`;
                    const top = entries.sort((a, b) => b[1] - a[1])[0];
                    response += ` Highest: ${top[0]} (${currency}${top[1].toLocaleString()}).`;
                } else {
                    response += ' No expenses recorded yet.';
                }
            }

        // 7. Recurring expenses
        } else if (lowerMsg.includes('recurring') || lowerMsg.includes('repeated') || lowerMsg.includes('monthly bill')) {
            const recs = await RecurringExpense.find({ userId: req.user._id, status: 'Active' });
            if (recs.length > 0) {
                let totalMonthly = 0;
                recs.forEach(r => {
                    if (r.recurrenceType === 'Monthly' || !r.recurrenceType) totalMonthly += r.amount;
                    else if (r.recurrenceType === 'Yearly') totalMonthly += r.amount / 12;
                    else if (r.recurrenceType === 'Custom') totalMonthly += r.amount;
                });
                response = `You have ${recs.length} active recurring expenses totaling ${currency}${Math.round(totalMonthly).toLocaleString()}/month.\n`;
                recs.slice(0, 5).forEach(r => {
                    const label = r.recurrenceType || 'Monthly';
                    response += `• ${r.title}: ${currency}${r.amount.toLocaleString()} (${label})\n`;
                });
                if (recs.length > 5) response += `...and ${recs.length - 5} more.`;
            } else {
                response = 'You don\'t have any recurring expenses set up. Add them from the Transactions page.';
            }

        // 8. Subscriptions
        } else if (lowerMsg.includes('subscription') || lowerMsg.includes('cancel')) {
            const subs = await Subscription.find({ userId: req.user._id, status: 'Active' });
            let monthlyCost = 0;
            subs.forEach(s => {
                if (s.billingCycle === 'Monthly') monthlyCost += s.amount;
                else if (s.billingCycle === 'Quarterly') monthlyCost += s.amount / 3;
                else if (s.billingCycle === 'Yearly') monthlyCost += s.amount / 12;
            });
            response = `You have ${subs.length} active subscriptions costing ${currency}${Math.round(monthlyCost).toLocaleString()}/month.`;
            if (subs.length > 0) {
                const subNames = subs.map(s => s.name).join(', ');
                response += ` Active: ${subNames}.`;
            }
            if (monthlyCost > (user.monthlyIncome || 0) * 0.1 && user.monthlyIncome > 0) {
                response += ' Consider cancelling unused subscriptions — they exceed 10% of your income.';
            }
            if (subs.length === 0) {
                response = 'You have no active subscriptions recorded. Add them in the Subscriptions page.';
            }

        // 9. Net worth meaning (educational)
        } else if (lowerMsg.includes('what is net worth') || lowerMsg.includes('net worth meaning') || lowerMsg.includes('explain net worth') || lowerMsg.includes('define net worth')) {
            response = `Net Worth is a measure of your financial health. It is calculated as:\n\nNet Worth = Total Assets - Total Liabilities\n\nAssets include: Cash, Bank balance, Savings, Investments, Property, Vehicle value.\nLiabilities include: Loans, Credit card debt, Mortgage, Borrowed money.\n\nA positive net worth means you own more than you owe. A negative net worth means you owe more than you own.`;

        // 10. Net worth summary
        } else if (lowerMsg.includes('net worth') || lowerMsg.includes('assets') || lowerMsg.includes('liabilities') || lowerMsg.includes('wealth') || lowerMsg.includes('worth')) {
            const items = await NetWorthItem.find({ userId: req.user._id });
            const assets = items.filter(i => i.type === 'Asset').reduce((s, i) => s + i.amount, 0);
            const liabilities = items.filter(i => i.type === 'Liability').reduce((s, i) => s + i.amount, 0);
            const netWorth = assets - liabilities;
            if (items.length > 0) {
                response = `Your net worth: ${currency}${netWorth.toLocaleString()}. Total Assets: ${currency}${assets.toLocaleString()}, Total Liabilities: ${currency}${liabilities.toLocaleString()}.`;
                if (netWorth < 0) response += ' Focus on paying off debts to improve your net worth.';
                else if (netWorth > 0) response += ' Keep building your wealth!';
            } else {
                response = 'You haven\'t added any net worth items yet. Go to the Net Worth page to track your assets and liabilities.';
            }

        // 11. Spending limits
        } else if (lowerMsg.includes('limit') || lowerMsg.includes('spending limit')) {
            const limits = await SpendingLimit.find({ userId: req.user._id, month: currentMonth, year: currentYear });
            if (limits.length > 0) {
                const exceeded = limits.filter(l => l.usagePercentage >= 100);
                response = `You have ${limits.length} spending limits set this month.`;
                if (exceeded.length > 0) {
                    response += ` ${exceeded.length} limit(s) exceeded: ${exceeded.map(l => l.category).join(', ')}.`;
                } else {
                    response += ' All within limits.';
                }
            } else {
                response = 'No spending limits set. Visit Spending Limits page to create them.';
            }

        // 12. Save / saving / investment
        } else if (lowerMsg.includes('save') || lowerMsg.includes('saving') || lowerMsg.includes('invest') || lowerMsg.includes('investment')) {
            const { total: totalExpense, byCat: categoryTotals } = await getCategoryTotals();
            const monthlyIncome = await getEffectiveIncome();
            const amount = extractNumber();

            if (monthlyIncome > 0) {
                const savings = monthlyIncome - totalExpense;
                const savingsPercent = Math.round((savings / monthlyIncome) * 100);
                response = `You can save ${currency}${Math.max(0, savings).toLocaleString()} this month (${Math.max(0, savingsPercent)}% of income). `;
                if (savingsPercent >= 20) response += 'Great job! You\'re meeting the 20% savings target.';
                else if (savingsPercent >= 10) response += 'Try to increase savings to 20% for better financial health.';
                else response += 'Your savings are low. Review discretionary spending to save more.';

                if (amount && savings < amount) {
                    const shortfall = amount - Math.max(0, savings);
                    response += ` To save ${currency}${amount.toLocaleString()}, you need ${currency}${shortfall.toLocaleString()} more.`;
                }

                const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
                if (sorted.length > 0) {
                    const topCat = sorted[0];
                    response += ` Your biggest expense is ${topCat[0]} (${currency}${topCat[1].toLocaleString()}).`;
                    if (topCat[0] === 'Food') response += ' Try meal planning and cooking at home to reduce costs.';
                    else if (topCat[0] === 'Shopping') response += ' Consider limiting impulse purchases using a 24-hour rule.';
                    else if (topCat[0] === 'Travel') response += ' Look for budget-friendly alternatives or carpool options.';
                    else if (topCat[0] === 'Entertainment') response += ' Reduce streaming subscriptions and opt for free activities.';
                    else response += ` Try reducing ${topCat[0]} spending by 10-15% to boost savings.`;
                }
            } else {
                const top = getTopCategory(categoryTotals);
                response = `Your total expenses this month are ${currency}${totalExpense.toLocaleString()}.`;
                if (top) response += ` Your biggest expense is ${top[0]} (${currency}${top[1].toLocaleString()}).`;

                if (amount) {
                    if (totalExpense === 0) {
                        response += ` To save ${currency}${amount.toLocaleString()}, just earn more than you spend.`;
                    } else {
                        const reduceTarget = Math.min(amount, totalExpense);
                        response += ` To save ${currency}${amount.toLocaleString()}, you'd need to reduce expenses by ~${currency}${reduceTarget.toLocaleString()} or increase income.`;
                        const topReduce = top ? Math.round((top[1] / totalExpense) * 100) : 0;
                        if (top && topReduce > 20) {
                            response += ` Cutting ${top[0]} by 50% would save ~${currency}${Math.round(top[1] / 2).toLocaleString()}.`;
                        }
                    }
                }
                response += incomeTip;
            }

        // 13. Goals (general)
        } else if (lowerMsg.includes('goal') || lowerMsg.includes('target') || lowerMsg.includes('objective')) {
            const goals = await Goal.find({ userId: req.user._id, status: 'Active' });
            if (goals.length > 0) {
                response = `You have ${goals.length} active goals:\n`;
                goals.forEach((g, i) => {
                    const progress = Math.round((g.currentAmount / g.targetAmount) * 100);
                    response += `${i + 1}. ${g.title}: ${currency}${g.currentAmount.toLocaleString()} / ${currency}${g.targetAmount.toLocaleString()} (${progress}%)\n`;
                });
            } else {
                const completedGoals = await Goal.find({ userId: req.user._id, status: 'Completed' });
                response = `You don't have any active goals.`;
                if (completedGoals.length > 0) response += ` You've completed ${completedGoals.length} goals in the past!`;
                response += ' Create new goals in the Future Planner!';
            }

        // 14. Income
        } else if (lowerMsg.includes('income') || lowerMsg.includes('earn') || lowerMsg.includes('salary')) {
            const incomes = await getIncomes();
            const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
            response = `Your total income this month: ${currency}${totalIncome.toLocaleString()}.`;
            if (incomes.length > 0) {
                response += ` Sources: ${incomes.map(i => i.source).join(', ')}.`;
            }
            if (user.monthlyIncome) {
                response += ` Monthly income set: ${currency}${user.monthlyIncome.toLocaleString()}.`;
            } else {
                response += ' Set your monthly income in Settings for better analysis.';
            }

        // 15. How am I doing / summary / financial health
        } else if (lowerMsg.includes('how am i') || lowerMsg.includes('summary') || lowerMsg.includes('financial health') || lowerMsg.includes('overview') || lowerMsg.includes('dashboard') || lowerMsg.includes('how is my')) {
            const { total: totalExpense, byCat: categoryTotals } = await getCategoryTotals();
            const monthlyIncome = await getEffectiveIncome();
            const balance = monthlyIncome - totalExpense;
            const goals = await Goal.find({ userId: req.user._id, status: 'Active' });

            response = `📊 Financial Summary for ${now.toLocaleString('default', { month: 'long' })}:\n`;
            response += `Income: ${currency}${monthlyIncome.toLocaleString()}\n`;
            response += `Expenses: ${currency}${totalExpense.toLocaleString()}\n`;
            response += `Balance: ${currency}${balance.toLocaleString()}\n`;
            if (Object.keys(categoryTotals).length > 0) {
                const topCat = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
                response += `Top category: ${topCat[0]} (${currency}${topCat[1].toLocaleString()})\n`;
            }
            if (goals.length > 0) {
                const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
                const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
                response += `Goals: ${currency}${totalSaved.toLocaleString()} saved of ${currency}${totalTarget.toLocaleString()}\n`;
            }
            if (balance > 0) response += '✅ You\'re in positive territory. Keep it up!';
            else if (balance === 0) response += '⚖️ You\'re breaking even. Try to save more.';
            else response += '⚠️ You\'re overspending. Review your expenses.';

        // 16. Specific category spending
        } else if (lowerMsg.includes('shopping') || lowerMsg.includes('travel') || lowerMsg.includes('rent') || lowerMsg.includes('entertainment') || lowerMsg.includes('bills') || lowerMsg.includes('education') || lowerMsg.includes('health')) {
            const { total: totalExpense, byCat: categoryTotals } = await getCategoryTotals();
            const categories = ['Food', 'Travel', 'Shopping', 'Bills', 'Education', 'Rent', 'Entertainment', 'Healthcare', 'Subscriptions'];
            const found = categories.find(c => lowerMsg.includes(c.toLowerCase()));
            const match = message.trim(); // Use original case for display
            if (found) {
                const amt = categoryTotals[found] || 0;
                response = `You spent ${currency}${amt.toLocaleString()} on ${found} this month.`;
                if (totalExpense > 0) {
                    const pct = Math.round((amt / totalExpense) * 100);
                    response += ` That's ${pct}% of your total spending.`;
                }
            } else {
                response = `I couldn't find spending data for "${match}". Try asking about Food, Travel, Shopping, Bills, Rent, Entertainment, Healthcare, or Education.`;
            }

        // 17. Hello / hi / hey
        } else if (lowerMsg.includes('hi') || lowerMsg.includes('hello') || lowerMsg.includes('hey') || lowerMsg.includes('greetings')) {
            response = `Hello ${user.name}! 👋 I'm your SpendWise AI assistant. I can help you track expenses, budgets, savings, goals, net worth, and more. Try asking me about your spending, savings, or financial summary!`;

        // 18. Help / what can you do
        } else if (lowerMsg.includes('help') || lowerMsg.includes('what can you do') || lowerMsg.includes('capabilities') || lowerMsg.includes('commands')) {
            response = `I can help with:\n• 💰 Expenses & spending analysis\n• 📊 Budget tracking & alerts\n• 💵 Savings advice & projections\n• 📋 Subscription management\n• 🏦 Net worth overview\n• 🎯 Goal progress tracking\n• 💼 Income tracking\n• ✈️ Trip/purchase affordability\n• 📈 Financial summary & health\n\nTry: "How much did I spend on food?" "Can I afford a trip?" "Give me a summary"`;

        // 19. Default - comprehensive fallback with general financial advice
        } else {
            const { total: totalExpense, byCat: categoryTotals } = await getCategoryTotals();
            const monthlyIncome = await getEffectiveIncome();
            const balance = monthlyIncome - totalExpense;
            const goals = await Goal.find({ userId: req.user._id, status: 'Active' });

            response = `I understand you're asking about "${message.trim()}". Here's what I can tell you:\n\n`;

            if (monthlyIncome > 0 || totalExpense > 0) {
                response += `📊 This month: Income ${currency}${monthlyIncome.toLocaleString()}, Expenses ${currency}${totalExpense.toLocaleString()}, Balance ${currency}${balance.toLocaleString()}.`;
            }
            if (Object.keys(categoryTotals).length > 0) {
                const top = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
                response += ` Top category: ${top[0]} (${currency}${top[1].toLocaleString()}).`;
            }
            if (goals.length > 0) {
                response += ` You have ${goals.length} active goal(s).`;
            }
            if (monthlyIncome === 0 && totalExpense > 0) {
                response += incomeTip;
            }

            response += `\n\nTry asking me specific questions like:\n• "How much did I spend on food?"\n• "Show my highest expenses"\n• "Can I afford a trip?"\n• "Give me a financial summary"\n• "How much can I save?"`;
        }

        const assistantMsg = await new ChatMessage({ userId: req.user._id, role: 'assistant', message: response }).save();
        res.json({ response, messageId: assistantMsg._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getChatHistory = async (req, res) => {
    try {
        const messages = await ChatMessage.find({ userId: req.user._id })
            .sort({ createdAt: 1 }).limit(100);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const clearChatHistory = async (req, res) => {
    try {
        await ChatMessage.deleteMany({ userId: req.user._id });
        res.json({ message: 'Chat history cleared' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { processMessage, getChatHistory, clearChatHistory };
