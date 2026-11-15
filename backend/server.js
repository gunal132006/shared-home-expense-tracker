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

// Ensure financial and API responses are never served from stale HTTP caches
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Health Check Endpoint (Required for Render)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Original household members constant for verification and fallback
const ORIGINAL_HOUSEHOLD_MEMBERS = ['Gunal', 'Gopi', 'Sathish', 'Sekar', 'Vishnu', 'Kumar', 'Hemu'];

async function ensureMembersSeeded() {
  try {
    for (const name of ORIGINAL_HOUSEHOLD_MEMBERS) {
      await db.query(`
        INSERT INTO members (name, status, move_in_date)
        SELECT $1, 'active', '2024-01-01'::DATE
        WHERE NOT EXISTS (SELECT 1 FROM members WHERE LOWER(name) = LOWER($1));
      `, [name]);
    }
  } catch (err) {
    console.error('[MEMBERS] ensureMembersSeeded warning:', err.message);
  }
}

// Database Member Helper Functions
async function getAllMembers() {
  try {
    let result = await db.query(
      "SELECT id, name, status, move_in_date, move_out_date, created_at, updated_at FROM members ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, name ASC"
    );
    if (!result.rows || result.rows.length === 0) {
      await ensureMembersSeeded();
      result = await db.query(
        "SELECT id, name, status, move_in_date, move_out_date, created_at, updated_at FROM members ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, name ASC"
      );
    }
    return (result && result.rows && result.rows.length > 0)
      ? result.rows
      : ORIGINAL_HOUSEHOLD_MEMBERS.map((name, idx) => ({
          id: idx + 1,
          name,
          status: 'active',
          move_in_date: '2024-01-01',
          move_out_date: null
        }));
  } catch (error) {
    console.error('Error fetching all members from DB:', error);
    return ORIGINAL_HOUSEHOLD_MEMBERS.map((name, idx) => ({
      id: idx + 1,
      name,
      status: 'active',
      move_in_date: '2024-01-01',
      move_out_date: null
    }));
  }
}

async function getActiveMembers() {
  try {
    let result = await db.query(
      "SELECT id, name, status, move_in_date, move_out_date, created_at, updated_at FROM members WHERE status = 'active' ORDER BY name ASC"
    );
    if (!result.rows || result.rows.length === 0) {
      const all = await getAllMembers();
      const active = all.filter(m => m.status === 'active');
      if (active.length > 0) return active;
    }
    return (result && result.rows && result.rows.length > 0)
      ? result.rows
      : ORIGINAL_HOUSEHOLD_MEMBERS.map((name, idx) => ({
          id: idx + 1,
          name,
          status: 'active',
          move_in_date: '2024-01-01',
          move_out_date: null
        }));
  } catch (error) {
    console.error('Error fetching active members from DB:', error);
    return ORIGINAL_HOUSEHOLD_MEMBERS.map((name, idx) => ({
      id: idx + 1,
      name,
      status: 'active',
      move_in_date: '2024-01-01',
      move_out_date: null
    }));
  }
}

async function getArchivedMembers() {
  try {
    const result = await db.query(
      "SELECT id, name, status, move_in_date, move_out_date, created_at, updated_at FROM members WHERE status = 'archived' ORDER BY move_out_date DESC, name ASC"
    );
    return result.rows || [];
  } catch (error) {
    console.error('Error fetching archived members from DB:', error);
    return [];
  }
}

// Members API Endpoints
app.get('/api/members', async (req, res) => {
  try {
    const { status, format } = req.query;
    let members;
    if (status === 'active') {
      members = await getActiveMembers();
    } else if (status === 'archived') {
      members = await getArchivedMembers();
    } else {
      members = await getAllMembers();
    }

    if (format === 'names') {
      return res.json(members.map(m => m.name));
    }
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/members/active', async (req, res) => {
  try {
    const { format } = req.query;
    const members = await getActiveMembers();
    if (format === 'names') {
      return res.json(members.map(m => m.name));
    }
    res.json(members);
  } catch (error) {
    console.error('Error fetching active members:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/members/archived', async (req, res) => {
  try {
    const members = await getArchivedMembers();
    res.json(members);
  } catch (error) {
    console.error('Error fetching archived members:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/members', async (req, res) => {
  const { name, move_in_date } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Member name is required' });
  }
  const cleanName = name.trim();
  if (cleanName.length > 100) {
    return res.status(400).json({ error: 'Member name must be 100 characters or fewer' });
  }

  try {
    // Check for duplicate name (case-insensitive)
    const existing = await db.query(
      "SELECT id, name, status FROM members WHERE LOWER(name) = LOWER($1)",
      [cleanName]
    );

    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      if (match.status === 'active') {
        return res.status(400).json({ error: `An active member named "${cleanName}" already exists.` });
      } else {
        return res.status(400).json({ 
          error: `A former member named "${cleanName}" already exists. You can restore them from Former Members instead of creating a duplicate.` 
        });
      }
    }

    const moveIn = move_in_date ? new Date(move_in_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    const result = await db.query(
      "INSERT INTO members (name, status, move_in_date) VALUES ($1, 'active', $2) RETURNING id, name, status, move_in_date, move_out_date, created_at, updated_at",
      [cleanName, moveIn]
    );

    res.status(201).json({ success: true, member: result.rows[0] });
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(500).json({ error: 'Failed to create member' });
  }
});

app.put('/api/members/:id', async (req, res) => {
  const { id } = req.params;
  const { name, move_in_date, move_out_date, status } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Member name is required' });
  }
  const cleanName = name.trim();

  try {
    const existing = await db.query("SELECT * FROM members WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    const currentMember = existing.rows[0];

    // Check duplicate name on other members
    const dupCheck = await db.query(
      "SELECT id FROM members WHERE LOWER(name) = LOWER($1) AND id != $2",
      [cleanName, id]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ error: `Another member named "${cleanName}" already exists.` });
    }

    const newMoveIn = move_in_date !== undefined ? (move_in_date ? new Date(move_in_date).toISOString().split('T')[0] : null) : currentMember.move_in_date;
    const newMoveOut = move_out_date !== undefined ? (move_out_date ? new Date(move_out_date).toISOString().split('T')[0] : null) : currentMember.move_out_date;
    const newStatus = status || currentMember.status;

    // Update in transaction if name changed to synchronize expenses and subscriptions
    if (cleanName !== currentMember.name) {
      await db.query('BEGIN');
      try {
        const updateRes = await db.query(
          "UPDATE members SET name = $1, move_in_date = $2, move_out_date = $3, status = $4, updated_at = NOW() WHERE id = $5 RETURNING id, name, status, move_in_date, move_out_date, created_at, updated_at",
          [cleanName, newMoveIn, newMoveOut, newStatus, id]
        );
        await db.query(
          "UPDATE expenses SET member_name = $1 WHERE member_id = $2 OR member_name = $3",
          [cleanName, id, currentMember.name]
        );
        await db.query(
          "UPDATE push_subscriptions SET member_name = $1 WHERE member_name = $2",
          [cleanName, currentMember.name]
        );
        await db.query('COMMIT');
        return res.json({ success: true, member: updateRes.rows[0] });
      } catch (txErr) {
        await db.query('ROLLBACK');
        throw txErr;
      }
    } else {
      const updateRes = await db.query(
        "UPDATE members SET name = $1, move_in_date = $2, move_out_date = $3, status = $4, updated_at = NOW() WHERE id = $5 RETURNING id, name, status, move_in_date, move_out_date, created_at, updated_at",
        [cleanName, newMoveIn, newMoveOut, newStatus, id]
      );
      return res.json({ success: true, member: updateRes.rows[0] });
    }
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

app.patch('/api/members/:id/archive', async (req, res) => {
  const { id } = req.params;
  const { move_out_date } = req.body;

  try {
    const existing = await db.query("SELECT * FROM members WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    const member = existing.rows[0];

    if (member.status === 'archived') {
      return res.status(400).json({ error: 'Member is already archived' });
    }

    // Ensure at least one active member remains
    const activeCountRes = await db.query(
      "SELECT COUNT(*) FROM members WHERE status = 'active' AND id != $1",
      [id]
    );
    if (parseInt(activeCountRes.rows[0].count) < 1) {
      return res.status(400).json({ error: 'Cannot archive the only active household member' });
    }

    const moveOut = move_out_date 
      ? new Date(move_out_date).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0];

    const result = await db.query(
      "UPDATE members SET status = 'archived', move_out_date = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, status, move_in_date, move_out_date, created_at, updated_at",
      [moveOut, id]
    );

    res.json({ success: true, member: result.rows[0] });
  } catch (error) {
    console.error('Error archiving member:', error);
    res.status(500).json({ error: 'Failed to archive member' });
  }
});

app.patch('/api/members/:id/restore', async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await db.query("SELECT * FROM members WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    const member = existing.rows[0];

    if (member.status === 'active') {
      return res.status(400).json({ error: 'Member is already active' });
    }

    // Check duplicate active name
    const dupCheck = await db.query(
      "SELECT id FROM members WHERE LOWER(name) = LOWER($1) AND status = 'active' AND id != $2",
      [member.name, id]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ error: `An active member named "${member.name}" already exists.` });
    }

    const result = await db.query(
      "UPDATE members SET status = 'active', move_out_date = NULL, updated_at = NOW() WHERE id = $1 RETURNING id, name, status, move_in_date, move_out_date, created_at, updated_at",
      [id]
    );

    res.json({ success: true, member: result.rows[0] });
  } catch (error) {
    console.error('Error restoring member:', error);
    res.status(500).json({ error: 'Failed to restore member' });
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
    
    // Resolve member_id if present in members table
    const memberRes = await db.query("SELECT id FROM members WHERE name = $1", [member_name]);
    const memberId = memberRes.rows.length > 0 ? memberRes.rows[0].id : null;

    const result = await db.query(
      "INSERT INTO expenses (item_name, amount, member_name, member_id, purchase_date, notes, month, year) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
      [item_name, parseFloat(amount), member_name, memberId, purchase_date, notes || '', month, year]
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

    const memberRes = await db.query("SELECT id FROM members WHERE name = $1", [member_name]);
    const memberId = memberRes.rows.length > 0 ? memberRes.rows[0].id : null;
    
    await db.query(
      "UPDATE expenses SET item_name = $1, amount = $2, member_name = $3, member_id = $4, purchase_date = $5, notes = $6, month = $7, year = $8 WHERE id = $9",
      [item_name, parseFloat(amount), member_name, memberId, purchase_date, notes || '', month, year, id]
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
    // Fetch rent, expenses, and members in parallel
    const [rent, expensesRes, allMembers, activeMembers] = await Promise.all([
      getMonthlyRent(),
      db.query(
        "SELECT * FROM expenses WHERE month = $1 AND year = $2",
        [targetMonth, targetYear]
      ),
      getAllMembers(),
      getActiveMembers()
    ]);
    const expenses = expensesRes.rows;

    const now = new Date();
    const isCurrentOrFuture = (targetYear > now.getFullYear()) || (targetYear === now.getFullYear() && targetMonth >= (now.getMonth() + 1));

    const monthStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const monthEnd = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    // Determine participating members roster for this month
    let roster;
    if (isCurrentOrFuture) {
      // Current household calculations: use the active household roster
      roster = activeMembers.map(m => m.name);
    } else {
      // Historical reports: include members active during that month
      roster = allMembers.filter(m => {
        const movedIn = m.move_in_date ? new Date(m.move_in_date) <= monthEnd : true;
        const movedOut = m.move_out_date ? new Date(m.move_out_date) >= monthStart : true;
        return movedIn && movedOut;
      }).map(m => m.name);
    }

    // Always ensure any member who recorded expenses in this month is accounted for
    expenses.forEach(exp => {
      if (!roster.includes(exp.member_name)) {
        roster.push(exp.member_name);
      }
    });

    if (roster.length === 0) {
      roster = activeMembers.length > 0 ? activeMembers.map(m => m.name) : ['House'];
    }

    let totalSharedExpense = 0;
    const memberSpending = {};
    roster.forEach(m => memberSpending[m] = 0);

    expenses.forEach(exp => {
      const amt = parseFloat(exp.amount);
      totalSharedExpense += amt;
      memberSpending[exp.member_name] = (memberSpending[exp.member_name] || 0) + amt;
    });

    const totalHouseExpense = totalSharedExpense + rent;
    // Exclude archived members from current household equal rent split; active members share rent equally
    const shareCount = isCurrentOrFuture ? Math.max(1, activeMembers.length) : Math.max(1, roster.length);
    const perPersonShare = totalHouseExpense / shareCount;

    const balances = roster.map(member => {
      const spent = memberSpending[member] || 0;
      const isActiveInSplit = isCurrentOrFuture ? activeMembers.some(m => m.name === member) : true;
      const share = isActiveInSplit ? perPersonShare : 0;
      const balance = spent - share;
      return {
        member,
        spent,
        share,
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
    const [rent, expensesRes, allMembers, activeMembers] = await Promise.all([
      getMonthlyRent(),
      db.query(
        "SELECT * FROM expenses WHERE month = $1 AND year = $2 ORDER BY purchase_date DESC",
        [targetMonth, targetYear]
      ),
      getAllMembers(),
      getActiveMembers()
    ]);
    const expenses = expensesRes.rows;

    const now = new Date();
    const isCurrentOrFuture = (targetYear > now.getFullYear()) || (targetYear === now.getFullYear() && targetMonth >= (now.getMonth() + 1));

    const monthStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const monthEnd = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    let roster;
    if (isCurrentOrFuture) {
      roster = activeMembers.map(m => m.name);
    } else {
      roster = allMembers.filter(m => {
        const movedIn = m.move_in_date ? new Date(m.move_in_date) <= monthEnd : true;
        const movedOut = m.move_out_date ? new Date(m.move_out_date) >= monthStart : true;
        return movedIn && movedOut;
      }).map(m => m.name);
    }

    expenses.forEach(exp => {
      if (!roster.includes(exp.member_name)) {
        roster.push(exp.member_name);
      }
    });

    if (roster.length === 0) {
      roster = activeMembers.length > 0 ? activeMembers.map(m => m.name) : ['House'];
    }

    let totalSharedExpense = 0;
    let memberTotalSpent = 0;
    const memberSpending = {};
    roster.forEach(m => memberSpending[m] = 0);

    expenses.forEach(exp => {
      const amt = parseFloat(exp.amount);
      totalSharedExpense += amt;
      memberSpending[exp.member_name] = (memberSpending[exp.member_name] || 0) + amt;
      if (exp.member_name === memberId) {
        memberTotalSpent += amt;
      }
    });

    const totalHouseExpense = totalSharedExpense + rent;
    const shareCount = isCurrentOrFuture ? Math.max(1, activeMembers.length) : Math.max(1, roster.length);
    const perPersonShare = totalHouseExpense / shareCount;

    const isMemberInSplit = isCurrentOrFuture ? activeMembers.some(m => m.name === memberId) : roster.includes(memberId);
    const memberShare = isMemberInSplit ? perPersonShare : 0;
    const memberBalance = memberTotalSpent - memberShare;
    
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

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Production Backend running on port ${port}`);
  });
}

module.exports = app;
