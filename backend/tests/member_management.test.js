// ================================================================
// HOMESPLIT AUTOMATED VERIFICATION TEST SUITE
// Tests all 12 scenarios required by user in an isolated test environment.
// Does NOT touch production database or create fake production data.
// ================================================================

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

// In-Memory Test Database Engine
class MockDB {
  constructor() {
    this.reset();
  }

  reset() {
    this.settings = [
      { setting_key: 'monthly_rent', setting_value: '17380' }
    ];
    this.members = [
      { id: 1, name: 'Gunal', status: 'active', move_in_date: '2024-01-01', move_out_date: null, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
      { id: 2, name: 'Gopi', status: 'active', move_in_date: '2024-01-01', move_out_date: null, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
      { id: 3, name: 'Sathish', status: 'active', move_in_date: '2024-01-01', move_out_date: null, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
      { id: 4, name: 'Sekar', status: 'active', move_in_date: '2024-01-01', move_out_date: null, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
      { id: 5, name: 'Vishnu', status: 'active', move_in_date: '2024-01-01', move_out_date: null, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
      { id: 6, name: 'Kumar', status: 'active', move_in_date: '2024-01-01', move_out_date: null, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
      { id: 7, name: 'Hemu', status: 'active', move_in_date: '2024-01-01', move_out_date: null, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') }
    ];
    this.nextMemberId = 8;
    this.expenses = [];
    this.nextExpenseId = 1;
    this.push_subscriptions = [];
  }

  async query(sql, params = []) {
    const s = sql.trim();

    // 1. SELECT * FROM settings
    if (s.includes('FROM settings WHERE setting_key')) {
      const key = params[0] || 'monthly_rent';
      const row = this.settings.find(st => st.setting_key === key);
      return { rows: row ? [row] : [] };
    }

    // 2. Members SELECT
    if (s.includes('FROM members WHERE status = $1 ORDER BY name ASC')) {
      const status = params[0];
      const rows = this.members.filter(m => m.status === status).sort((a, b) => a.name.localeCompare(b.name));
      return { rows: JSON.parse(JSON.stringify(rows)) };
    }

    if (s.includes('FROM members WHERE status = \'archived\'')) {
      const rows = this.members.filter(m => m.status === 'archived').sort((a, b) => a.name.localeCompare(b.name));
      return { rows: JSON.parse(JSON.stringify(rows)) };
    }

    if (s.includes('FROM members WHERE status = \'active\'')) {
      const rows = this.members.filter(m => m.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
      return { rows: JSON.parse(JSON.stringify(rows)) };
    }

    if (s.includes('SELECT id, name, status, move_in_date, move_out_date, created_at, updated_at FROM members ORDER BY')) {
      const rows = [...this.members].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return { rows: JSON.parse(JSON.stringify(rows)) };
    }

    if (s.includes('SELECT id, name, status FROM members WHERE LOWER(name) = LOWER($1)')) {
      const name = params[0];
      const match = this.members.find(m => m.name.toLowerCase() === name.toLowerCase());
      return { rows: match ? [JSON.parse(JSON.stringify(match))] : [] };
    }

    if (s.includes('SELECT id FROM members WHERE LOWER(name) = LOWER($1) AND id != $2')) {
      const [name, id] = params;
      const match = this.members.find(m => m.name.toLowerCase() === name.toLowerCase() && String(m.id) !== String(id));
      return { rows: match ? [match] : [] };
    }

    if (s.includes('SELECT id FROM members WHERE LOWER(name) = LOWER($1) AND status = \'active\' AND id != $2')) {
      const [name, id] = params;
      const match = this.members.find(m => m.name.toLowerCase() === name.toLowerCase() && m.status === 'active' && String(m.id) !== String(id));
      return { rows: match ? [match] : [] };
    }

    if (s.includes('SELECT * FROM members WHERE id = $1')) {
      const id = params[0];
      const match = this.members.find(m => String(m.id) === String(id));
      return { rows: match ? [JSON.parse(JSON.stringify(match))] : [] };
    }

    if (s.includes('SELECT id FROM members WHERE name = $1')) {
      const name = params[0];
      const match = this.members.find(m => m.name === name);
      return { rows: match ? [{ id: match.id }] : [] };
    }

    if (s.includes('SELECT COUNT(*) FROM members WHERE status = \'active\' AND id != $1')) {
      const id = params[0];
      const count = this.members.filter(m => m.status === 'active' && String(m.id) !== String(id)).length;
      return { rows: [{ count: String(count) }] };
    }

    // 3. INSERT INTO members
    if (s.includes('INSERT INTO members (name, status, move_in_date)')) {
      if (s.includes('WHERE NOT EXISTS')) {
        const name = params[0];
        if (name && !this.members.some(m => m.name.toLowerCase() === name.toLowerCase())) {
          const newMember = {
            id: this.nextMemberId++,
            name,
            status: 'active',
            move_in_date: '2024-01-01',
            move_out_date: null,
            created_at: new Date(),
            updated_at: new Date()
          };
          this.members.push(newMember);
          return { rows: [JSON.parse(JSON.stringify(newMember))] };
        }
        return { rows: [] };
      }
      const [name, status, move_in_date] = params.length === 2 ? [params[0], 'active', params[1]] : params;
      const newMember = {
        id: this.nextMemberId++,
        name,
        status: status || 'active',
        move_in_date: move_in_date || new Date().toISOString().split('T')[0],
        move_out_date: null,
        created_at: new Date(),
        updated_at: new Date()
      };
      this.members.push(newMember);
      return { rows: [JSON.parse(JSON.stringify(newMember))] };
    }

    // 4. UPDATE members (archive)
    if (s.includes('UPDATE members SET status = \'archived\'')) {
      const [move_out_date, id] = params;
      const member = this.members.find(m => String(m.id) === String(id));
      if (member) {
        member.status = 'archived';
        member.move_out_date = move_out_date;
        member.updated_at = new Date();
        return { rows: [JSON.parse(JSON.stringify(member))] };
      }
      return { rows: [] };
    }

    // 5. UPDATE members (restore)
    if (s.includes('UPDATE members SET status = \'active\'')) {
      const [id] = params;
      const member = this.members.find(m => String(m.id) === String(id));
      if (member) {
        member.status = 'active';
        member.move_out_date = null;
        member.updated_at = new Date();
        return { rows: [JSON.parse(JSON.stringify(member))] };
      }
      return { rows: [] };
    }

    // 6. UPDATE members general
    if (s.includes('UPDATE members SET name = $1')) {
      const [name, move_in, move_out, status, id] = params;
      const member = this.members.find(m => String(m.id) === String(id));
      if (member) {
        member.name = name;
        member.move_in_date = move_in;
        member.move_out_date = move_out;
        member.status = status;
        member.updated_at = new Date();
        return { rows: [JSON.parse(JSON.stringify(member))] };
      }
      return { rows: [] };
    }

    // 7. EXPENSES
    if (s.includes('INSERT INTO expenses')) {
      const [item_name, amount, member_name, member_id, purchase_date, notes, month, year] = params;
      const newExp = {
        id: this.nextExpenseId++,
        item_name,
        amount: parseFloat(amount),
        member_name,
        member_id: member_id || null,
        purchase_date: new Date(purchase_date),
        notes: notes || '',
        month: parseInt(month),
        year: parseInt(year),
        created_at: new Date()
      };
      this.expenses.push(newExp);
      return { rows: [{ id: newExp.id }] };
    }

    if (s.includes('FROM expenses WHERE month = $1 AND year = $2')) {
      const [month, year] = [parseInt(params[0]), parseInt(params[1])];
      let filtered = this.expenses.filter(e => e.month === month && e.year === year);
      if (params[2]) {
        filtered = filtered.filter(e => e.member_name === params[2]);
      }
      return { rows: JSON.parse(JSON.stringify(filtered)) };
    }

    if (s.includes('FROM expenses ORDER BY purchase_date DESC')) {
      return { rows: JSON.parse(JSON.stringify(this.expenses)) };
    }

    if (s.includes('UPDATE expenses SET member_name = $1')) {
      const [newName, memberId, oldName] = params;
      this.expenses.forEach(e => {
        if (String(e.member_id) === String(memberId) || e.member_name === oldName) {
          e.member_name = newName;
        }
      });
      return { rowCount: 1 };
    }

    if (s.includes('BEGIN') || s.includes('COMMIT') || s.includes('ROLLBACK')) {
      return { rows: [] };
    }

    return { rows: [] };
  }
}

describe('HomeSplit Member Management Automated Test Suite', () => {
  const mockDb = new MockDB();
  const db = require('../db');
  let originalQuery;
  let server;
  let baseUrl;

  before(async () => {
    // Intercept db.query to use isolated in-memory test database
    originalQuery = db.query;
    db.query = (sql, params) => mockDb.query(sql, params);

    const app = require('../server');
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    db.query = originalQuery;
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  const request = async (method, path, body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const req = http.request(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, text: data });
          }
        });
      });
      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  };

  it('Scenario 1 & 2: Add a new member and verify they appear in active list', async () => {
    // Initial active members should be 7
    const initialRes = await request('GET', '/api/members/active');
    assert.strictEqual(initialRes.status, 200);
    assert.strictEqual(initialRes.body.length, 7);

    // 1. Add new member
    const addRes = await request('POST', '/api/members', {
      name: 'Kavin',
      move_in_date: '2026-11-01'
    });
    assert.strictEqual(addRes.status, 201);
    assert.strictEqual(addRes.body.success, true);
    assert.strictEqual(addRes.body.member.name, 'Kavin');
    assert.strictEqual(addRes.body.member.status, 'active');

    // 2. Verify appears in active list
    const activeRes = await request('GET', '/api/members/active');
    assert.strictEqual(activeRes.status, 200);
    assert.strictEqual(activeRes.body.length, 8);
    const found = activeRes.body.find(m => m.name === 'Kavin');
    assert.ok(found, 'Kavin must be present in active members');

    // Verify duplicate active member prevention
    const dupRes = await request('POST', '/api/members', {
      name: 'kavin',
      move_in_date: '2026-11-01'
    });
    assert.strictEqual(dupRes.status, 400);
    assert.match(dupRes.body.error, /already exists/i);
  });

  it('Scenario 3 & 4: Archive an existing member and verify they move to Former Members', async () => {
    // 3. Archive member Sekar (id: 4)
    const archiveRes = await request('PATCH', '/api/members/4/archive', {
      move_out_date: '2026-11-01'
    });
    assert.strictEqual(archiveRes.status, 200);
    assert.strictEqual(archiveRes.body.member.status, 'archived');
    assert.strictEqual(archiveRes.body.member.move_out_date, '2026-11-01');

    // 4. Verify Sekar is removed from active and moved to former/archived list
    const activeRes = await request('GET', '/api/members/active');
    assert.strictEqual(activeRes.body.some(m => m.name === 'Sekar'), false);

    const archivedRes = await request('GET', '/api/members/archived');
    assert.strictEqual(archivedRes.status, 200);
    const archivedSekar = archivedRes.body.find(m => m.name === 'Sekar');
    assert.ok(archivedSekar, 'Sekar must be in archived list');
    assert.strictEqual(archivedSekar.status, 'archived');
  });

  it('Scenario 5 & 6: Restore an archived member and verify they appear in active selector again', async () => {
    // 5. Restore Sekar (id: 4)
    const restoreRes = await request('PATCH', '/api/members/4/restore');
    assert.strictEqual(restoreRes.status, 200);
    assert.strictEqual(restoreRes.body.member.status, 'active');
    assert.strictEqual(restoreRes.body.member.move_out_date, null);

    // 6. Verify Sekar appears in active members again
    const activeRes = await request('GET', '/api/members/active');
    const restoredSekar = activeRes.body.find(m => m.name === 'Sekar');
    assert.ok(restoredSekar, 'Sekar must be back in active members');
  });

  it('Scenario 7: Verify historical expenses remain unchanged when members move out or change', async () => {
    // Record historical expenses in October 2026
    await request('POST', '/api/expenses', {
      item_name: 'October Groceries',
      amount: 1400,
      member_name: 'Sekar',
      purchase_date: '2026-10-15',
      notes: 'Historical expense by Sekar'
    });

    await request('POST', '/api/expenses', {
      item_name: 'October WiFi',
      amount: 1600,
      member_name: 'Gunal',
      purchase_date: '2026-10-10',
      notes: 'Historical WiFi'
    });

    // Now archive Sekar again with move-out date 2026-11-01
    await request('PATCH', '/api/members/4/archive', { move_out_date: '2026-11-01' });

    // 7. Verify historical expenses in October 2026 are completely intact
    const octExpensesRes = await request('GET', '/api/expenses?month=10&year=2026');
    assert.strictEqual(octExpensesRes.status, 200);
    assert.strictEqual(octExpensesRes.body.length, 2);
    
    const sekarExp = octExpensesRes.body.find(e => e.item_name === 'October Groceries');
    assert.ok(sekarExp);
    assert.strictEqual(sekarExp.member_name, 'Sekar');
    assert.strictEqual(sekarExp.amount, 1400);
  });

  it('Scenario 8: Verify historical reports still identify former members', async () => {
    // 8. Historical settlement report for October 2026
    const octSettlement = await request('GET', '/api/reports/settlement?month=10&year=2026');
    assert.strictEqual(octSettlement.status, 200);

    // In October 2026, Sekar was active and had expenses -> Sekar MUST be in balances
    const sekarBalance = octSettlement.body.balances.find(b => b.member === 'Sekar');
    assert.ok(sekarBalance, 'Former member Sekar must be identified in October 2026 historical report');
    assert.strictEqual(sekarBalance.spent, 1400);

    // Kavin joined in November 2026 -> Kavin must NOT be billed for October 2026 rent/expenses
    const kavinBalance = octSettlement.body.balances.find(b => b.member === 'Kavin');
    assert.strictEqual(kavinBalance, undefined, 'New member Kavin must NOT appear in October 2026 historical report');
  });

  it('Scenario 9: Verify current settlement uses the correct active roster and excludes archived members from rent', async () => {
    // Current setup:
    // We archive Sekar (id: 4) and Kumar (id: 6) as moved out in Nov 2026
    await request('PATCH', '/api/members/6/archive', { move_out_date: '2026-11-01' });
    
    // Add second new member Dinesh
    await request('POST', '/api/members', { name: 'Dinesh', move_in_date: '2026-11-01' });

    // Active roster should now be: Gunal, Gopi, Sathish, Vishnu, Hemu, Kavin, Dinesh (7 active members)
    const activeRes = await request('GET', '/api/members/active');
    assert.strictEqual(activeRes.body.length, 7);

    // Add November 2026 expense for Gunal: ₹3,500
    await request('POST', '/api/expenses', {
      item_name: 'November Provisions',
      amount: 3500,
      member_name: 'Gunal',
      purchase_date: '2026-11-05',
      notes: ''
    });

    // 9. Current settlement calculation (November 2026)
    const novSettlement = await request('GET', '/api/reports/settlement?month=11&year=2026');
    assert.strictEqual(novSettlement.status, 200);

    // Verify monthly rent remains 17380
    assert.strictEqual(novSettlement.body.monthlyRent, 17380);
    assert.strictEqual(novSettlement.body.totalSharedExpense, 3500);
    assert.strictEqual(novSettlement.body.totalHouseExpense, 3500 + 17380); // 20,880

    // Equal split among the 7 active members: 20880 / 7 = 2982.857...
    const expectedShare = 20880 / 7;
    assert.ok(Math.abs(novSettlement.body.perPersonShare - expectedShare) < 0.01);

    // Archived members (Sekar, Kumar) must NOT be charged rent in November
    const sekarInNov = novSettlement.body.balances.find(b => b.member === 'Sekar');
    assert.strictEqual(sekarInNov, undefined, 'Archived member Sekar should not be in active November rent split');

    // Active members (Kavin, Dinesh) MUST be in the active rent split
    const kavinInNov = novSettlement.body.balances.find(b => b.member === 'Kavin');
    assert.ok(kavinInNov, 'Active new member Kavin must be in November settlement');
    assert.ok(Math.abs(kavinInNov.share - expectedShare) < 0.01);
  });

  it('Scenario 10: Verify monthly rent remains correct (₹17,380)', async () => {
    const settingsRes = await request('GET', '/api/settings');
    assert.strictEqual(settingsRes.status, 200);
    assert.strictEqual(parseFloat(settingsRes.body.monthly_rent), 17380);
  });

  it('Scenario 11: Verify all existing dashboard and analytics endpoints still work', async () => {
    // 1. Dashboard stats endpoint
    const dashRes = await request('GET', '/api/reports/dashboard/Gunal?month=11&year=2026');
    assert.strictEqual(dashRes.status, 200);
    assert.strictEqual(dashRes.body.monthlyRent, 17380);
    assert.strictEqual(dashRes.body.memberTotalSpent, 3500);
    assert.ok(dashRes.body.memberBalance > 0);
    assert.ok(Array.isArray(dashRes.body.memberSpending));

    // 2. Monthly analytics endpoint
    const analyticsRes = await request('GET', '/api/reports/monthly-analytics?month=11&year=2026');
    assert.strictEqual(analyticsRes.status, 200);
    assert.strictEqual(analyticsRes.body.month, 11);
    assert.strictEqual(analyticsRes.body.year, 2026);
    assert.strictEqual(analyticsRes.body.totalAmount, 3500);
    assert.strictEqual(analyticsRes.body.count, 1);
  });

  it('Scenario 12: Verify data synchronization across fresh API requests', async () => {
    // When requesting format=names, ensure format matches legacy array
    const namesRes = await request('GET', '/api/members?format=names');
    assert.strictEqual(namesRes.status, 200);
    assert.ok(Array.isArray(namesRes.body));
    assert.strictEqual(typeof namesRes.body[0], 'string');

    // Ensure member name updates synchronize properly across expenses
    const updateRes = await request('PUT', '/api/members/1', {
      name: 'Gunal S',
      move_in_date: '2024-01-01'
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.member.name, 'Gunal S');

    // Check that expenses for Gunal are now associated with Gunal S
    const expRes = await request('GET', '/api/expenses?month=11&year=2026');
    const gunalExp = expRes.body.find(e => e.item_name === 'November Provisions');
    assert.strictEqual(gunalExp.member_name, 'Gunal S');
  });

  it('Scenario 13: Verify CORS preflight OPTIONS request explicitly permits PATCH for production Vercel origin', async () => {
    const preflightRes = await request('OPTIONS', '/api/members/4/archive', null, {
      'Origin': 'https://shared-home-expense-tracker.vercel.app',
      'Access-Control-Request-Method': 'PATCH',
      'Access-Control-Request-Headers': 'Content-Type'
    });
    // CORS middleware responds 204 No Content for preflight
    assert.ok(preflightRes.status === 204 || preflightRes.status === 200, `Expected 204 or 200, got: ${preflightRes.status}`);
    const allowMethods = preflightRes.headers['access-control-allow-methods'] || '';
    assert.ok(allowMethods.includes('PATCH'), `CORS methods must include PATCH, got: ${allowMethods}`);
    assert.strictEqual(
      preflightRes.headers['access-control-allow-origin'],
      'https://shared-home-expense-tracker.vercel.app',
      'Origin must match Vercel production origin'
    );
  });

  it('Scenario 14: Verify archive and restore endpoints work via both PATCH and POST aliases', async () => {
    // Add temporary member
    const tempMember = await request('POST', '/api/members', { name: 'TempMember', move_in_date: '2026-11-01' });
    const memberId = tempMember.body.member.id;

    // Archive using POST alias
    const postArchiveRes = await request('POST', `/api/members/${memberId}/archive`, { move_out_date: '2026-11-15' });
    assert.strictEqual(postArchiveRes.status, 200);
    assert.strictEqual(postArchiveRes.body.member.status, 'archived');
    assert.strictEqual(postArchiveRes.body.member.move_out_date, '2026-11-15');

    // Restore using POST alias
    const postRestoreRes = await request('POST', `/api/members/${memberId}/restore`);
    assert.strictEqual(postRestoreRes.status, 200);
    assert.strictEqual(postRestoreRes.body.member.status, 'active');
    assert.strictEqual(postRestoreRes.body.member.move_out_date, null);
  });
});
