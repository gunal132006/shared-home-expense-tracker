const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Health Check Endpoint (Required for Render)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get static members
const MEMBERS = ['Gunal', 'Gopi', 'Sathish', 'Sekar', 'Vishnu', 'Kumar', 'Hemu'];

app.get('/api/members', (req, res) => {
  try {
    res.json(MEMBERS);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Settings API
app.get('/api/settings', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM settings WHERE setting_key = 'monthly_rent'");
    if (result.rows.length > 0) {
      res.json({ monthly_rent: parseFloat(result.rows[0].setting_value) });
    } else {
      res.json({ monthly_rent: 17380 });
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  const { monthly_rent } = req.body;
  if (monthly_rent === undefined || monthly_rent < 0) {
    return res.status(400).json({ error: 'Invalid rent amount' });
  }
  try {
    await db.query(
      "INSERT INTO settings (setting_key, setting_value) VALUES ('monthly_rent', $1) ON CONFLICT(setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value",
      [monthly_rent.toString()]
    );
    res.json({ success: true, monthly_rent });
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Expenses API
app.get('/api/expenses', async (req, res) => {
  const { month, year } = req.query;
  try {
    let result;
    if (month && year) {
      result = await db.query(
        "SELECT * FROM expenses WHERE EXTRACT(MONTH FROM purchase_date) = $1 AND EXTRACT(YEAR FROM purchase_date) = $2 ORDER BY purchase_date DESC",
        [parseInt(month), parseInt(year)]
      );
    } else {
      result = await db.query("SELECT * FROM expenses ORDER BY purchase_date DESC");
    }
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { item_name, amount, member_name, purchase_date, notes } = req.body;
  
  if (!item_name || !amount || !member_name || !purchase_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const result = await db.query(
      "INSERT INTO expenses (item_name, amount, member_name, purchase_date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [item_name, parseFloat(amount), member_name, purchase_date, notes || '']
    );
    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Failed to add expense:', error);
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  const { item_name, amount, member_name, purchase_date, notes } = req.body;
  
  try {
    await db.query(
      "UPDATE expenses SET item_name = $1, amount = $2, member_name = $3, purchase_date = $4, notes = $5 WHERE id = $6",
      [item_name, parseFloat(amount), member_name, purchase_date, notes || '', id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM expenses WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Settlement API
app.get('/api/reports/settlement', async (req, res) => {
  const { month, year } = req.query;
  const targetMonth = month ? parseInt(month) : (new Date().getMonth() + 1);
  const targetYear = year ? parseInt(year) : new Date().getFullYear();

  try {
    // Get rent
    const settingsRes = await db.query("SELECT * FROM settings WHERE setting_key = 'monthly_rent'");
    const rent = settingsRes.rows.length > 0 ? parseFloat(settingsRes.rows[0].setting_value) : 17380;

    // Get expenses
    const expensesRes = await db.query(
      "SELECT * FROM expenses WHERE EXTRACT(MONTH FROM purchase_date) = $1 AND EXTRACT(YEAR FROM purchase_date) = $2",
      [targetMonth, targetYear]
    );
    const expenses = expensesRes.rows;

    let totalSharedExpense = 0;
    const memberSpending = {};
    MEMBERS.forEach(m => memberSpending[m] = 0);

    expenses.forEach(exp => {
      const amt = parseFloat(exp.amount);
      totalSharedExpense += amt;
      if (memberSpending[exp.member_name] !== undefined) {
        memberSpending[exp.member_name] += amt;
      }
    });

    const totalHouseExpense = totalSharedExpense + rent;
    const perPersonShare = totalHouseExpense / MEMBERS.length;

    const balances = MEMBERS.map(member => {
      const spent = memberSpending[member];
      const balance = spent - perPersonShare;
      return {
        member,
        spent,
        share: perPersonShare,
        balance,
        status: balance > 0 ? 'Receive' : (balance < 0 ? 'Pay' : 'Settled')
      };
    });

    // Generate settlement suggestions (optimized)
    let debtors = balances.filter(b => b.balance < -0.01).map(b => ({ name: b.member, amount: Math.abs(b.balance) }));
    let creditors = balances.filter(b => b.balance > 0.01).map(b => ({ name: b.member, amount: b.balance }));
    
    // Sort descending to settle largest debts first (minimizes transaction count)
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const suggestions = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      let debtor = debtors[i];
      let creditor = creditors[j];
      
      let amount = Math.min(debtor.amount, creditor.amount);
      
      suggestions.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(amount * 100) / 100
      });

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    res.json({
      totalSharedExpense,
      monthlyRent: rent,
      totalHouseExpense,
      perPersonShare,
      balances,
      suggestions
    });
  } catch (error) {
    console.error('Failed to generate settlement:', error);
    res.status(500).json({ error: 'Failed to generate settlement' });
  }
});

// Member Dashboard Stats API
app.get('/api/reports/dashboard/:memberId', async (req, res) => {
  const memberId = req.params.memberId;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  try {
    const settingsRes = await db.query("SELECT * FROM settings WHERE setting_key = 'monthly_rent'");
    const rent = settingsRes.rows.length > 0 ? parseFloat(settingsRes.rows[0].setting_value) : 17380;

    const expensesRes = await db.query(
      "SELECT * FROM expenses WHERE EXTRACT(MONTH FROM purchase_date) = $1 AND EXTRACT(YEAR FROM purchase_date) = $2 ORDER BY purchase_date DESC",
      [currentMonth, currentYear]
    );
    const expenses = expensesRes.rows;

    let totalSharedExpense = 0;
    let memberTotalSpent = 0;
    const memberSpending = {};
    MEMBERS.forEach(m => memberSpending[m] = 0);

    expenses.forEach(exp => {
      const amt = parseFloat(exp.amount);
      totalSharedExpense += amt;
      if (memberSpending[exp.member_name] !== undefined) {
        memberSpending[exp.member_name] += amt;
      }
      if (exp.member_name === memberId) {
        memberTotalSpent += amt;
      }
    });

    const totalHouseExpense = totalSharedExpense + rent;
    const perPersonShare = totalHouseExpense / MEMBERS.length;
    const memberBalance = memberTotalSpent - perPersonShare;
    
    // Percentage contribution
    const contributionPercentage = totalSharedExpense > 0 
      ? Math.round((memberTotalSpent / totalSharedExpense) * 100) 
      : 0;

    res.json({
      totalSharedExpense,
      monthlyRent: rent,
      totalHouseExpense,
      perPersonShare,
      memberTotalSpent,
      memberBalance,
      contributionPercentage,
      recentExpenses: expenses.slice(0, 10),
      memberSpending: Object.keys(memberSpending).map(name => ({
        name,
        amount: memberSpending[name]
      }))
    });

  } catch (error) {
    console.error('Failed to get member dashboard stats:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

app.listen(port, () => {
  console.log(`Production Backend running on port ${port}`);
});
