const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const webpush = require('web-push');
const compression = require('compression');
require('dotenv').config();

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:test@test.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const app = express();
const port = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: function (origin, callback) {
    // Safely reflect origin to support dynamic Vercel preview domains
    callback(null, origin || '*');
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

// In-memory cache for static monthly_rent setting
let cachedRent = null;

async function getMonthlyRent() {
  if (cachedRent !== null) return cachedRent;
  try {
    const settingsRes = await db.query("SELECT * FROM settings WHERE setting_key = 'monthly_rent'");
    const rent = settingsRes.rows.length > 0 ? parseFloat(settingsRes.rows[0].setting_value) : 17380;
    cachedRent = rent;
    return rent;
  } catch (error) {
    console.error('Error fetching rent setting:', error);
    return 17380;
  }
}

// Settings API
app.get('/api/settings', async (req, res) => {
  try {
    const rent = await getMonthlyRent();
    res.json({ monthly_rent: rent });
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
    cachedRent = parseFloat(monthly_rent);
    res.json({ success: true, monthly_rent });
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Expenses API
app.get('/api/expenses', async (req, res) => {
  const { month, year, limit, offset } = req.query;
  const limitClause = limit ? `LIMIT ${parseInt(limit)}` : '';
  const offsetClause = offset ? `OFFSET ${parseInt(offset)}` : '';

  try {
    let result;
    if (month && year) {
      result = await db.query(
        `SELECT * FROM expenses WHERE month = $1 AND year = $2 ORDER BY purchase_date DESC ${limitClause} ${offsetClause}`,
        [parseInt(month), parseInt(year)]
      );
    } else {
      result = await db.query(`SELECT * FROM expenses ORDER BY purchase_date DESC ${limitClause} ${offsetClause}`);
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
    const dateObj = new Date(purchase_date);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    
    const result = await db.query(
      "INSERT INTO expenses (item_name, amount, member_name, purchase_date, notes, month, year) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [item_name, parseFloat(amount), member_name, purchase_date, notes || '', month, year]
    );

    // Send push notifications asynchronously
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      db.query("SELECT subscription FROM push_subscriptions WHERE member_name != $1", [member_name])
        .then(subs => {
          const payload = JSON.stringify({
            title: 'Shared Home Expense Tracker',
            body: `${member_name} added ₹${parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })} for ${item_name}`
          });
          
          const uniqueEndpoints = new Set();
          let attemptCount = 0;

          subs.rows.forEach(row => {
            const sub = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
            if (!sub || !sub.endpoint) return;

            if (uniqueEndpoints.has(sub.endpoint)) {
              console.log('[PUSH] Skipped duplicate endpoint during send:', sub.endpoint.substring(0, 40) + '...');
              return;
            }
            uniqueEndpoints.add(sub.endpoint);
            attemptCount++;

            webpush.sendNotification(sub, payload).catch(error => {
              console.error('Error sending notification, possible expired subscription:', error);
              if (error.statusCode === 410 || error.statusCode === 404) {
                db.query("DELETE FROM push_subscriptions WHERE subscription->>'endpoint' = $1", [sub.endpoint])
                  .then(() => console.log('[PUSH] Cleaned up expired subscription:', sub.endpoint.substring(0, 40) + '...'))
                  .catch(console.error);
              }
            });
          });
          console.log(`[PUSH] Triggered notifications for ${attemptCount} unique devices (Excluded ${subs.rows.length - attemptCount} duplicates).`);
        })
        .catch(err => console.error('Error fetching subscriptions:', err));
    }

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
    const dateObj = new Date(purchase_date);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    
    await db.query(
      "UPDATE expenses SET item_name = $1, amount = $2, member_name = $3, purchase_date = $4, notes = $5, month = $6, year = $7 WHERE id = $8",
      [item_name, parseFloat(amount), member_name, purchase_date, notes || '', month, year, id]
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
    // Fetch rent and expenses in parallel
    const [rent, expensesRes] = await Promise.all([
      getMonthlyRent(),
      db.query(
        "SELECT * FROM expenses WHERE month = $1 AND year = $2",
        [targetMonth, targetYear]
      )
    ]);
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
  const { month, year } = req.query;
  const targetMonth = month ? parseInt(month) : (new Date().getMonth() + 1);
  const targetYear = year ? parseInt(year) : new Date().getFullYear();
  
  try {
    const [rent, expensesRes] = await Promise.all([
      getMonthlyRent(),
      db.query(
        "SELECT * FROM expenses WHERE month = $1 AND year = $2 ORDER BY purchase_date DESC",
        [targetMonth, targetYear]
      )
    ]);
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

// Monthly Analytics API
app.get('/api/reports/monthly-analytics', async (req, res) => {
  const { month, year, member, category } = req.query;
  const targetMonth = month ? parseInt(month) : (new Date().getMonth() + 1);
  const targetYear = year ? parseInt(year) : new Date().getFullYear();
  
  try {
    let query = "SELECT * FROM expenses WHERE month = $1 AND year = $2";
    let params = [targetMonth, targetYear];
    let paramIndex = 3;

    if (member) {
      query += ` AND member_name = $${paramIndex}`;
      params.push(member);
      paramIndex++;
    }
    
    // If category filtering is added in the future, it would be appended here.
    query += " ORDER BY purchase_date ASC"; // Ascending for easier trend charting on frontend
    
    const result = await db.query(query, params);
    const expenses = result.rows;
    
    const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    
    res.json({
      month: targetMonth,
      year: targetYear,
      totalAmount,
      count: expenses.length,
      expenses
    });

  } catch (error) {
    console.error('Failed to get monthly analytics:', error);
    res.status(500).json({ error: 'Failed to get monthly analytics' });
  }
});

// Push Notifications API
app.get('/api/notifications/vapidPublicKey', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.post('/api/notifications/subscribe', async (req, res) => {
  const { member_name, subscription } = req.body;
  if (!member_name || !subscription) {
    return res.status(400).json({ error: 'Missing member_name or subscription' });
  }

  try {
    const endpoint = subscription.endpoint;
    if (!endpoint) {
      return res.status(400).json({ error: 'Invalid subscription endpoint' });
    }

    // Delete any existing subscription with the same endpoint to ensure uniqueness
    // This handles both re-subscribing on the same device and switching members on same device
    const delResult = await db.query(
      "DELETE FROM push_subscriptions WHERE subscription->>'endpoint' = $1",
      [endpoint]
    );
    
    if (delResult.rowCount > 0) {
      console.log(`[PUSH] Removed ${delResult.rowCount} existing subscription(s) for endpoint: ${endpoint.substring(0, 40)}...`);
    }

    await db.query(
      "INSERT INTO push_subscriptions (member_name, subscription) VALUES ($1, $2)",
      [member_name, subscription]
    );
    
    console.log(`[PUSH] New subscription saved for ${member_name}`);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Failed to save subscription:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

app.post('/api/notifications/unsubscribe', async (req, res) => {
  const { member_name, endpoint } = req.body;
  if (!member_name || !endpoint) {
    return res.status(400).json({ error: 'Missing member_name or endpoint' });
  }

  try {
    const delResult = await db.query(
      "DELETE FROM push_subscriptions WHERE member_name = $1 AND subscription->>'endpoint' = $2",
      [member_name, endpoint]
    );
    console.log(`[PUSH] Unsubscribed ${member_name}. Rows removed: ${delResult.rowCount}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

app.listen(port, () => {
  console.log(`Production Backend running on port ${port}`);
});
