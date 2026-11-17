// Demo simulator: resets sample data, then streams new orders, inventory changes and loyalty updates.
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
export function setup(dir) {
  copyFileSync(join(dir, 'orders.seed.ndjson'), join(dir, 'orders.ndjson'));
  const db = new DatabaseSync(join(dir, 'shop.db'));
  db.exec(`DROP TABLE IF EXISTS inventory; CREATE TABLE inventory(sku TEXT PRIMARY KEY, warehouse TEXT, stock INTEGER, updated_at TEXT);`);
  const now = () => new Date().toISOString();
  const ins = db.prepare('INSERT INTO inventory VALUES(?,?,?,?)');
  [['P1', 'Reno', 40], ['P2', 'Reno', 12], ['P3', 'Austin', 300], ['P4', 'Austin', 25], ['P5', 'Newark', 60]].forEach(r => ins.run(...r, now()));
  const tiers = ['bronze', 'silver', 'gold'];
  const loyalty = [{ cust_id: ' C1', tier: 'gold', points: '920' }, { cust_id: 'c2', tier: 'silver', points: '410' }, { cust_id: 'C5 ', tier: 'bronze', points: '75' }];
  const cust = ['c1', 'c2', 'c3', 'c4', 'c5'], skus = ['P1', 'P2', 'P3', 'P4', 'P5'], price = { P1: 120, P2: 180, P3: 18, P4: 75, P5: 90 }, wh = ['Reno', 'Austin', 'Newark'];
  let n = 4, i = 0;
  const timer = setInterval(() => {
    i++;
    if (n < 24) { const s = skus[i % 5], q = 1 + (i % 3); appendFileSync(join(dir, 'orders.ndjson'), JSON.stringify({ order_id: 'O' + n++, customer_id: cust[(i * 3) % 5], sku: s, qty: q, total: price[s] * q, ts: now() }) + '\n'); }
    const s = skus[i % 5];
    db.prepare('UPDATE inventory SET stock = max(0, stock - ?), warehouse = CASE WHEN ? THEN ? ELSE warehouse END, updated_at = ? WHERE sku = ?').run(1 + (i % 4), i % 7 === 0 ? 1 : 0, wh[i % 3], now(), s);
    if (i % 4 === 0) { const l = loyalty[i % 3]; l.tier = tiers[(tiers.indexOf(l.tier) + 1) % 3]; l.points = String(+l.points + 50); }
  }, 1200);
  timer.unref();
  return { loyalty: () => loyalty, stop: () => { clearInterval(timer); try { db.close(); } catch {} } };
}
