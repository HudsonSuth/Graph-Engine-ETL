// Train Splink models (unsupervised: random-sampling u + expectation maximisation; no labels used) and save them to
// explore/er/models/<Type>.splink.json, which the ER stage loads at start. Default input: the synthetic demo fixture.
//   node explore/er/train.mjs [records.json]     records.json = { records: [{ id, type, label, properties }] }
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { erConfig, ER_DIR } from './config.js';
import { SidecarMatcher } from './sidecar.js';
import { ErEngine } from './engine.js';

const file = process.argv[2] || join(ER_DIR, '..', 'demos', 'er', 'fixture.json');
const cfg = erConfig({ engine: 'splink' });
const m = await new SidecarMatcher({ engine: 'splink', log: console.log }).start();
const e = new ErEngine({ cfg, matcher: m });
await e.start();
const recs = JSON.parse(readFileSync(file, 'utf8')).records;
mkdirSync(cfg.modelsDir, { recursive: true });
for (const type of Object.keys(cfg.types)) {
  const rs = recs.filter(r => r.type === type);
  if (rs.length < cfg.minTrainRecords) { console.log(`${type}: only ${rs.length} records, skipped (need ${cfg.minTrainRecords})`); continue; }
  await m.upsert(type, rs.map(r => ({ id: r.id, values: e.values(type, r.properties) })));
  const t = await m.train(type, cfg.minTrainRecords);
  writeFileSync(join(cfg.modelsDir, `${type}.splink.json`), JSON.stringify(t.model, null, 1));
  console.log(`${type}: trained on ${rs.length} records in ${t.ms} ms -> ${join(cfg.modelsDir, `${type}.splink.json`)}`);
}
await m.close();
