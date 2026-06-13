require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const budgetRoutes = require('./routes/budgetRoutes');

const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const goalRoutes = require('./routes/goalRoutes');
const userRoutes = require('./routes/userRoutes');
const recurringExpenseRoutes = require('./routes/recurringExpenseRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const netWorthRoutes = require('./routes/netWorthRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const spendingLimitRoutes = require('./routes/spendingLimitRoutes');
const aiChatRoutes = require('./routes/aiChatRoutes');
const compulsorySavingRoutes = require('./routes/compulsorySavingRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/budget', budgetRoutes);

app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/recurring-expenses', recurringExpenseRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/net-worth', netWorthRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/spending-limits', spendingLimitRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/compulsory-savings', compulsorySavingRoutes);

app.get('/', (req, res) => {
    res.send('SpendWise AI API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
