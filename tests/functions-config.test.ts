import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Deploys run non-interactively, so every defineString() param in the functions
// must have a value in functions/.env, or `firebase deploy` stops with
// "have no value for the following environment variables".
describe('functions config', () => {
  it('every defineString param has a value in functions/.env', () => {
    const src = readFileSync('functions/index.js', 'utf8');
    const params = [...src.matchAll(/defineString\(\s*'([A-Z0-9_]+)'/g)].map((m) => m[1]);
    const env = readFileSync('functions/.env', 'utf8');
    const defined = new Set([...env.matchAll(/^([A-Z0-9_]+)=/gm)].map((m) => m[1]));
    expect(params.length).toBeGreaterThan(0);
    expect(params.filter((p) => !defined.has(p))).toEqual([]);
  });
});
