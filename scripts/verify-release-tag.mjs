#!/usr/bin/env node
/**
 * Asserts that the release tag being built matches the version in every
 * publishable package. Guards against tagging v1.2.0 while the manifests still
 * say 1.1.0, which would silently republish the previous version.
 *
 * Usage: node scripts/verify-release-tag.mjs v1.2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

const repoRoot = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const packagesDir = path.join(repoRoot, 'packages');

const tag = process.argv[2];
if (!tag) {
    console.error('usage: node scripts/verify-release-tag.mjs <tag>');
    process.exit(2);
}

if (!/^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(tag)) {
    console.error(`Tag "${tag}" is not a release tag of the form vMAJOR.MINOR.PATCH`);
    process.exit(1);
}

const expected = tag.slice(1);
const mismatches = [];

for (const name of fs.readdirSync(packagesDir)) {
    const manifestPath = path.join(packagesDir, name, 'package.json');
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    if (manifest.private === true) continue;
    if (manifest.version !== expected) {
        mismatches.push(`${manifest.name} is at ${manifest.version}, tag says ${expected}`);
    }
}

if (mismatches.length > 0) {
    console.error(`Tag ${tag} does not match the workspace:\n`);
    for (const mismatch of mismatches) console.error(`  - ${mismatch}`);
    console.error('\nRun "pnpm run version-packages", commit, then re-tag.');
    process.exit(1);
}

console.log(`Tag ${tag} matches all publishable packages.`);
