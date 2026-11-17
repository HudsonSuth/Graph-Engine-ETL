// A tiny external MCP server used by the MCP client tests (stdio when run directly, in-memory via buildMockServer()).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';

// Two different people share the name "Sam" (so a mapping keyed on name is wrong), and MANAGES is directed.
export const DIRECTORY = {
  people: [
    { id: 'p1', name: 'Ana Ruiz', team: 'core', email: 'ana@example.com' },
    { id: 'p2', name: 'Sam Lee', team: 'core', email: 'sam.lee@example.com' },
    { id: 'p3', name: 'Sam Lee', team: 'ops', email: 'sam.l@example.com' },
    { id: 'p4', name: 'Kai Moss', team: 'ops', email: 'kai@example.com' },
  ],
  teams: [{ key: 'core', title: 'Core Platform' }, { key: 'ops', title: 'Operations' }],
  relations: [
    { src: 'p1', dst: 'p2', rel: 'MANAGES', since: 2023 },
    { src: 'p1', dst: 'p3', rel: 'MANAGES', since: 2024 },
    { src: 'p3', dst: 'p4', rel: 'MANAGES', since: 2025 },
  ],
};

export function buildMockServer(data = DIRECTORY) {
  const s = new McpServer({ name: 'mock-directory', version: '1.0.0' });
  s.registerTool('list_directory', { description: 'People, teams and reporting lines', inputSchema: { team: z.string().optional() } }, async ({ team }) => {
    const people = data.people.filter(p => !team || p.team === team), ids = new Set(people.map(p => p.id));
    const out = { people, teams: data.teams, relations: data.relations.filter(r => ids.has(r.src) && ids.has(r.dst)) };
    return { content: [{ type: 'text', text: JSON.stringify(out) }] }; // text JSON (no structuredContent) on purpose
  });
  s.registerTool('ping', { description: 'noop' }, async () => ({ content: [{ type: 'text', text: 'pong' }] }));
  return s;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await buildMockServer().connect(new StdioServerTransport());
