"""Splink entity-resolution sidecar (SPEC §21). Same JSON-lines protocol as the Duke sidecar (DukeSidecar.java):
one request per line {"rid", "ns", "op", ...} -> {"rid", "ok", ...}.

Matching is done by Splink 5 (https://github.com/moj-analytical-services/splink, MIT): a Fellegi-Sunter model with
m/u probabilities trained without labels (random sampling + expectation maximisation), DuckDB (MIT) as the SQL engine,
Splink blocking rules for candidate generation and Splink's incremental API (predict_between / predict_within, score_pair)
for new or changed records. This file only adds the line protocol, the live-record table, field cleaners and the
per-feature explanation (Splink's own match weights: mw_<feature> = log2 Bayes factor, prior = log2(lambda/(1-lambda))).

Ops: config | train | upsert | remove | compare | stats | reset | exit
"""
import json, logging, math, re, sys, time, unicodedata

import duckdb
import pyarrow as pa
import splink.comparison_library as cl
from splink import DuckDBAPI, Linker, SettingsCreator, block_on

# common English given-name diminutives -> canonical form (general knowledge, written for this project)
NICK = {}
for canon, alts in {
    'robert': 'bob rob bobby robbie', 'william': 'bill will billy willy', 'richard': 'rick dick rich richie', 'james': 'jim jimmy jamie',
    'michael': 'mike mikey mick', 'joseph': 'joe joey', 'thomas': 'tom tommy', 'charles': 'charlie chuck chas', 'daniel': 'dan danny',
    'matthew': 'matt', 'anthony': 'tony', 'donald': 'don donnie', 'steven': 'steve', 'stephen': 'steve', 'andrew': 'andy drew', 'joshua': 'josh',
    'kenneth': 'ken kenny', 'timothy': 'tim timmy', 'ronald': 'ron ronnie', 'edward': 'ed eddie ted', 'jeffrey': 'jeff', 'nicholas': 'nick nicky',
    'jonathan': 'jon', 'benjamin': 'ben benny', 'samuel': 'sam sammy', 'gregory': 'greg', 'alexander': 'alex', 'patrick': 'pat',
    'jennifer': 'jen jenny', 'elizabeth': 'liz beth betsy lizzie', 'patricia': 'patty trish', 'margaret': 'maggie peggy meg', 'kimberly': 'kim',
    'deborah': 'deb debbie', 'rebecca': 'becky', 'katherine': 'kate kathy katie', 'christine': 'chris', 'samantha': 'sammie', 'susan': 'sue',
    'cynthia': 'cindy', 'pamela': 'pam', 'jessica': 'jess', 'christopher': 'chris', 'david': 'dave davey', 'gerald': 'jerry',
}.items():
    for a in alts.split():
        NICK.setdefault(a, canon)

ABBR = {'street': 'st', 'avenue': 'ave', 'av': 'ave', 'road': 'rd', 'drive': 'dr', 'lane': 'ln', 'court': 'ct', 'boulevard': 'blvd', 'place': 'pl',
        'terrace': 'ter', 'parkway': 'pkwy', 'highway': 'hwy', 'circle': 'cir', 'apartment': 'apt', 'suite': 'ste', 'unit': 'apt',
        'north': 'n', 'south': 's', 'east': 'e', 'west': 'w'}
CO_DROP = {'inc', 'incorporated', 'llc', 'ltd', 'limited', 'corp', 'corporation', 'co', 'company', 'plc', 'gmbh', 'the', 'and', 'group', 'holdings'}
MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']


def fold(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9@.\- ]', ' ', s)).strip()


def c_lower(v): return fold(v)
def c_trim(v): return str(v).strip()
def c_digits(v): return re.sub(r'\D', '', str(v))
def c_email(v): return str(v).strip().lower()
def c_phone(v):
    d = re.sub(r'\D', '', str(v))
    return d[1:] if len(d) == 11 and d.startswith('1') else d
def c_person(v):
    toks = re.sub(r'[.\-]', ' ', fold(v)).split()
    return ' '.join(NICK.get(t, t) for t in toks if len(t) > 1 or len(toks) <= 2)   # drop middle initials
def c_address(v):
    s = fold(str(v).replace('#', ' apt '))
    return ' '.join(ABBR.get(t, t) for t in re.sub(r'[.,]', ' ', s).split())
def c_company(v):
    s = fold(str(v).replace('&', ' and '))
    return ' '.join(t for t in re.sub(r'[.,]', ' ', s).split() if t not in CO_DROP)
def c_date(v):
    s = str(v).strip().lower()
    m = re.match(r'^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})', s)
    if m: return f'{m[1]}-{int(m[2]):02d}-{int(m[3]):02d}'
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', s)
    if m: return f'{m[3]}-{int(m[1]):02d}-{int(m[2]):02d}'
    m = re.match(r'^(\d{1,2})\.(\d{1,2})\.(\d{4})$', s)
    if m: return f'{m[3]}-{int(m[2]):02d}-{int(m[1]):02d}'
    m = re.match(r'^([a-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4})$', s)
    if m and m[1] in MON: return f'{m[3]}-{MON.index(m[1]) + 1:02d}-{int(m[2]):02d}'
    return s


def c_first(v): t = str(v).split(); return t[0] if t else ''
def c_last(v): t = str(v).split(); return t[-1] if t else ''


CLEANERS = {'first-token': c_first, 'last-token': c_last, 'lowercase': c_lower, 'trim': c_trim, 'digits': c_digits, 'email': c_email, 'phone': c_phone, 'person-name': c_person,
            'address': c_address, 'company': c_company, 'date': c_date}


def comparison(name, comp):
    if comp == 'exact': return cl.ExactMatch(name)
    if comp == 'date': return cl.DateOfBirthComparison(name, input_is_string=True)
    if comp in ('levenshtein', 'weighted-levenshtein'): return cl.LevenshteinAtThresholds(name, [1, 2])
    if comp in ('jaro-winkler', 'person-name', 'jaro-winkler-tokenized', 'soundex', 'metaphone'): return cl.JaroWinklerAtThresholds(name, [0.95, 0.88])
    if comp in ('qgram', 'dice', 'jaccard', 'lcs'): return cl.JaroWinklerAtThresholds(name, [0.95, 0.85])
    if comp == 'numeric': return cl.ExactMatch(name)
    raise ValueError(f'unknown comparator {comp}')


class Space:
    """One record type: its Splink model, live-record table and DuckDB connection."""

    def __init__(self):
        self.con = duckdb.connect()
        self.db = DuckDBAPI(self.con)
        self.linker = None
        self.live = {}           # id -> cleaned row
        self.n = 0
        self.stats = {'queries': 0, 'pairsScored': 0, 'trained': False}

    # ---------------------------------------------------------------- config / model
    def configure(self, c):
        self.threshold = float(c.get('threshold', 0.9)); self.maybe = float(c.get('maybeThreshold', 0.6))
        self.props = [p['name'] for p in c['properties']]
        self.cleaners = {p['name']: [CLEANERS[x] for x in ([p['cleaner']] if isinstance(p.get('cleaner'), str) else p.get('cleaner') or [])] for p in c['properties']}
        self.namey = [p['name'] for p in c['properties'] if p.get('comparator') in ('jaro-winkler', 'person-name', 'jaro-winkler-tokenized')]
        self.cols = ['unique_id'] + self.props + [f'{n}__{k}' for n in self.namey for k in ('first', 'last', 'f1')]
        blocking = c.get('blocking') or ([[p['name']] for p in c['properties'] if p.get('lookup') == 'true' and p['name'] not in self.namey] +
                                          [[f'{n}__last'] for n in self.namey] + [[f'{n}__first', f'{n}__last'] for n in self.namey])
        self.blocking = [block_on(*b) for b in blocking]
        self.con.execute('drop table if exists live')
        self.con.execute('create table live (' + ', '.join(f'"{c}" varchar' for c in self.cols) + ')')
        model = c.get('model')
        if model:
            model = dict(model); model['blocking_rules_to_generate_predictions'] = [b.get_blocking_rule('duckdb').create_sql_dict() if hasattr(b, 'get_blocking_rule') else b for b in self.blocking] if c.get('blocking') else model.get('blocking_rules_to_generate_predictions')
            model['retain_intermediate_calculation_columns'] = True; model['retain_matching_columns'] = True
            self.settings = model; self.stats['trained'] = True
        else:
            self.settings = SettingsCreator(link_type='dedupe_only', comparisons=[comparison(p['name'], p.get('comparator', 'levenshtein')) for p in c['properties']],
                                            blocking_rules_to_generate_predictions=self.blocking, retain_intermediate_calculation_columns=True, retain_matching_columns=True)
            self.stats['trained'] = False
        self.live.clear()
        self._linker()
        return {'engine': 'splink-5.0.0', 'trained': self.stats['trained'], 'blocking': [str(b) for b in blocking]}

    def _linker(self):
        self.n += 1
        sdf = self.db.register('live', table_name=f'live_{self.n}')
        self.linker = Linker(sdf, self.settings, log_level=logging.ERROR)
        self.labels = {}
        for comp in self.linker._settings_obj.comparisons:
            col = comp.output_column_name
            self.labels[col] = {lvl.comparison_vector_value: lvl.label_for_charts for lvl in comp.comparison_levels}
        self.prior = math.log2(self.linker._settings_obj._probability_two_random_records_match / (1 - self.linker._settings_obj._probability_two_random_records_match))

    def train(self, min_records=100):
        if len(self.live) < min_records: raise ValueError(f'need at least {min_records} records to train (have {len(self.live)})')
        if not isinstance(self.settings, SettingsCreator):
            raise ValueError('already trained from a model; reconfigure without "model" to retrain')
        t0 = time.time()
        tr = self.linker.training
        det = [block_on(p) for p in self.props if p not in self.namey][:2] or self.blocking[:1]
        tr.estimate_probability_two_random_records_match(det, recall=0.7)
        tr.estimate_u_using_random_sampling(max_pairs=2e6, seed=1)
        for b in self.blocking: 
            try: tr.estimate_parameters_using_expectation_maximisation(b, fix_u_probabilities=True)
            except Exception: pass   # a rule whose columns are all being estimated cannot train them; others cover it
        model = self.linker.misc.save_model_to_json()
        self.settings = model; self.stats['trained'] = True
        self._linker()
        return {'model': model, 'ms': round((time.time() - t0) * 1000)}

    # ---------------------------------------------------------------- records
    def clean(self, r):
        row = {'unique_id': r['id']}
        vals = r.get('values') or {}
        for p in self.props:
            v = vals.get(p)
            if isinstance(v, list): v = next((x for x in v if x not in (None, '')), None)  # Splink compares one value per feature
            if v in (None, ''): row[p] = None; continue
            s = str(v)
            for f in self.cleaners[p]: s = f(s)
            row[p] = s or None
        for n in self.namey:
            toks = (row.get(n) or '').split()
            row[f'{n}__first'] = toks[0] if toks else None; row[f'{n}__last'] = toks[-1] if toks else None; row[f'{n}__f1'] = toks[0][0] if toks else None
        return row

    def _table(self, name, rows):
        self.con.register('_in', pa.Table.from_pylist(rows, schema=pa.schema([(c, pa.string()) for c in self.cols])))
        self.con.execute(f'create or replace table {name} as select * from _in'); self.con.unregister('_in')

    def upsert(self, records):
        rows = [self.clean(r) for r in records]
        ids = [r['unique_id'] for r in rows]
        new = {r['unique_id']: r for r in rows}
        rows = list(new.values())
        self.n += 1; k = self.n
        self._table(f'batch_{k}', rows)
        self.con.execute(f'delete from live where unique_id in (select unique_id from batch_{k})')
        self.con.execute(f'create or replace table exist_{k} as select * from live')
        self.con.execute(f'insert into live select * from batch_{k}')
        self.live.update(new)
        out = {i: [] for i in new}
        preds = []
        self.stats['queries'] += 1
        if len(self.live) > len(new):
            L = self.db.register(f'exist_{k}', table_name=f'L_{k}'); R = self.db.register(f'batch_{k}', table_name=f'R_{k}')
            preds.append(self.linker.inference.predict_between(L, R, threshold_match_probability=self.maybe))
        if len(new) > 1:
            W = self.db.register(f'batch_{k}', table_name=f'W_{k}')
            preds.append(self.linker.inference.predict_within(W, threshold_match_probability=self.maybe))
        for p in preds:
            for d in p.as_record_list():
                a, b = d['unique_id_l'], d['unique_id_r']
                lo, hi = (a, b) if a < b else (b, a)
                m = {'score': d['match_probability'], 'matchWeight': d['match_weight'], 'why': self.why(d, swap=(lo != a)), 'prior': self.prior}
                self.stats['pairsScored'] += 1
                if a in out: out[a].append({'id': b, **m})
                if b in out: out[b].append({'id': a, **m})
            p.drop_table_from_database_and_remove_from_cache()
        self.con.execute(f'drop table if exists batch_{k}'); self.con.execute(f'drop table if exists exist_{k}')
        return {'results': [{'id': i, 'matches': out[i]} for i in new]}

    def why(self, d, swap=False):
        res = []
        for col, labels in self.labels.items():
            g = d.get(f'gamma_{col}')
            if g is None or g == -1: continue   # null on either side: no evidence (Splink weight 0)
            a, b = d.get(f'{col}_l'), d.get(f'{col}_r')
            if swap: a, b = b, a
            w = d.get(f'mw_{col}') or 0.0
            res.append({'property': col, 'a': a, 'b': b, 'level': labels.get(g, str(g)), 'gamma': g, 'weight': w, 'probability': 2 ** w / (1 + 2 ** w)})
        return res

    def remove(self, ids):
        n = 0
        for i in ids:
            if self.live.pop(i, None) is not None: n += 1
        if ids:
            self._table('_rm', [{'unique_id': i} for i in ids])
            self.con.execute('delete from live where unique_id in (select unique_id from _rm)')
        return {'removed': n}

    def compare(self, a, b):
        ra, rb = self.live.get(a), self.live.get(b)
        if ra is None or rb is None: raise ValueError(f'unknown record {a if ra is None else b}')
        lo, hi = (ra, rb) if a < b else (rb, ra)
        r = self.linker.inference.score_pair(lo, hi).as_record_list()[0]
        return {'score': r['match_probability'], 'matchWeight': r['match_weight'], 'prior': self.prior, 'why': self.why(r, swap=(lo is not ra)), 'threshold': self.threshold, 'maybeThreshold': self.maybe}


def main():
    spaces = {}
    out = sys.stdout
    sys.stdout = sys.stderr   # stray prints never corrupt the protocol
    out.write(json.dumps({'ready': True, 'engine': 'splink-5.0.0'}) + '\n'); out.flush()
    for line in sys.stdin:
        line = line.strip()
        if not line: continue
        req = None
        try:
            req = json.loads(line)
            op = req.get('op'); s = spaces.setdefault(req.get('ns') or 'default', Space())
            if op == 'config': res = s.configure(req['config'])
            elif op == 'train': res = s.train(int(req.get('minRecords', 100)))
            elif op == 'upsert': res = s.upsert(req['records'])
            elif op == 'remove': res = s.remove(req.get('ids') or [])
            elif op == 'compare': res = s.compare(req['a'], req['b'])
            elif op == 'stats': res = {'records': len(s.live), **s.stats}
            elif op == 'reset': s.remove(list(s.live)); res = {}
            elif op == 'exit': res = {}
            else: raise ValueError(f'unknown op {op}')
            res['ok'] = True
        except Exception as e:  # noqa: BLE001 - reported to the caller
            res = {'ok': False, 'error': f'{type(e).__name__}: {e}'}
        if req and 'rid' in req: res['rid'] = req['rid']
        out.write(json.dumps(res, default=str) + '\n'); out.flush()
        if req and req.get('op') == 'exit': break


if __name__ == '__main__':
    main()
