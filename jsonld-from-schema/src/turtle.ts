/** Deterministic Turtle serialization helpers (D-02). */

export function turtleEscape(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

export function iriRef(iri: string): string {
  return `<${iri}>`;
}

export function lit(value: string, datatype?: string): string {
  const s = `"${turtleEscape(value)}"`;
  return datatype ? `${s}^^${datatype}` : s;
}

export function numLit(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(n);
}

export interface Triple {
  s: string;
  p: string;
  o: string;
}

export function serializeTurtle(prefixes: Record<string, string>, triples: Triple[]): string {
  const prefixNames = Object.keys(prefixes).sort();
  const lines: string[] = [];
  for (const p of prefixNames) {
    lines.push(`@prefix ${p}: <${prefixes[p]}> .`);
  }
  if (prefixNames.length) lines.push("");

  const sorted = [...triples].sort((a, b) => {
    if (a.s !== b.s) return a.s < b.s ? -1 : 1;
    if (a.p !== b.p) return a.p < b.p ? -1 : 1;
    return a.o < b.o ? -1 : a.o > b.o ? 1 : 0;
  });

  // Group by subject for readable but still sorted output
  let i = 0;
  while (i < sorted.length) {
    const subj = sorted[i].s;
    const group: Triple[] = [];
    while (i < sorted.length && sorted[i].s === subj) {
      group.push(sorted[i]);
      i++;
    }
    if (group.length === 1) {
      lines.push(`${group[0].s} ${group[0].p} ${group[0].o} .`);
    } else {
      lines.push(`${subj}`);
      for (let j = 0; j < group.length; j++) {
        const t = group[j];
        const end = j === group.length - 1 ? " ." : " ;";
        lines.push(`    ${t.p} ${t.o}${end}`);
      }
    }
  }

  return lines.join("\n") + (lines.length ? "\n" : "");
}
