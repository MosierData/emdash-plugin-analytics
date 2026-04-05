#!/usr/bin/env node
/**
 * Conditionally applies the emdash compatibility patch.
 *
 * The patch adds ctx.kv.getRaw() and ctx.kv.commitIfValueUnchanged() to emdash.
 * Once a future emdash release ships these methods natively this script becomes
 * a no-op automatically — no consumer action required.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';

const PATCH_METHODS = ['getRaw', 'commitIfValueUnchanged'];
const tag = '[emdash-plugin-analytics]';

function emdashAlreadyHasMethods() {
  try {
    const distDir = resolve('node_modules/emdash/dist');
    const files = readdirSync(distDir).filter(f => f.endsWith('.mjs'));
    for (const file of files) {
      const content = readFileSync(join(distDir, file), 'utf8');
      if (PATCH_METHODS.every(m => content.includes(m))) return true;
    }
  } catch {
    // emdash not installed or dist missing — proceed to patch attempt
  }
  return false;
}

if (emdashAlreadyHasMethods()) {
  console.log(`${tag} emdash already has required KV APIs — skipping patch.`);
} else {
  console.log(`${tag} Applying emdash compatibility patch…`);
  try {
    execSync('npx --yes patch-package', { stdio: 'inherit' });
    console.log(`${tag} Patch applied successfully.`);
  } catch (err) {
    console.error(`${tag} Failed to apply patch: ${err.message}`);
    console.error(`${tag} Run "npx patch-package" manually in your project root.`);
    process.exit(1);
  }
}
