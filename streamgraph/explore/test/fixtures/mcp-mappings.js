// Mapping configs for the mock directory. MCP_MAPPING=wrong selects a deliberately wrong one (keyed on the
// non-unique name and with reversed link direction); the MCP client tests MUST fail against it.
export const RIGHT = {
  nodes: [
    { from: '/people/*', id: 'id', type: 'Person', label: 'name', properties: ['team', 'email'] },
    { from: '/teams/*', id: 'key', type: 'Team', label: 'title' },
  ],
  links: [
    { from: '/relations/*', source: 'src', target: 'dst', type: { field: 'rel' }, properties: ['since'] },
    { from: '/people/*', source: 'id', target: 'team', type: 'MEMBER_OF' },
  ],
};
export const WRONG = {
  nodes: [
    { from: '/people/*', id: 'name', type: 'Person', label: 'name', properties: ['team', 'email'] },
    { from: '/teams/*', id: 'key', type: 'Team', label: 'title' },
  ],
  links: [
    { from: '/relations/*', source: 'dst', target: 'src', type: { field: 'rel' }, properties: ['since'] },
    { from: '/people/*', source: 'name', target: 'team', type: 'MEMBER_OF' },
  ],
};
export const MAPPING = process.env.MCP_MAPPING === 'wrong' ? WRONG : RIGHT;
