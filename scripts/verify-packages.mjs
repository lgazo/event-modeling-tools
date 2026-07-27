#!/usr/bin/env node
/**
 * Publish preflight.
 *
 * Packs every publishable workspace package exactly the way `pnpm publish`
 * would, then asserts the resulting tarball is self-contained and consistent.
 * Run by CI on every push and again immediately before publishing.
 *
 * Checks, in order:
 *   1. all publishable packages carry the same version (they are a fixed group)
 *   2. required metadata is present (license, repository, engines.node, ...)
 *   3. no install-time lifecycle scripts that would assume a git checkout
 *   4. every workspace dependency of a published package is itself published
 *   5. the packed tarball contains the files that `main`/`exports`/`bin` point at
 *   6. the packed manifest has no unresolved `workspace:` / `file:` specifiers
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as url from 'node:url';

const repoRoot = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const packagesDir = path.join(repoRoot, 'packages');

const errors = [];
const fail = (message) => errors.push(message);

const readManifest = (dir) =>
    JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'));

const workspacePackages = fs
    .readdirSync(packagesDir)
    .map((name) => path.join(packagesDir, name))
    .filter((dir) => fs.existsSync(path.join(dir, 'package.json')))
    .map((dir) => ({ dir, manifest: readManifest(dir) }));

const byName = new Map(workspacePackages.map((p) => [p.manifest.name, p]));
const publishable = workspacePackages.filter((p) => p.manifest.private !== true);

if (publishable.length === 0) {
    fail('no publishable packages found');
}

// --- 1. version lockstep -----------------------------------------------------

const versions = new Set(publishable.map((p) => p.manifest.version));
if (versions.size > 1) {
    const detail = publishable
        .map((p) => `${p.manifest.name}@${p.manifest.version}`)
        .join(', ');
    fail(`publishable packages are not in version lockstep: ${detail}`);
}

// --- 2 & 3. metadata and lifecycle scripts -----------------------------------

const REQUIRED_FIELDS = ['description', 'license', 'author', 'repository', 'homepage', 'files'];
const FORBIDDEN_SCRIPTS = ['postinstall', 'preinstall', 'install', 'prepare'];

for (const { manifest } of publishable) {
    for (const field of REQUIRED_FIELDS) {
        if (!manifest[field]) {
            fail(`${manifest.name}: missing "${field}" in package.json`);
        }
    }
    if (!manifest.engines?.node) {
        fail(`${manifest.name}: missing "engines.node"`);
    }
    if (manifest.license !== 'Apache-2.0') {
        fail(`${manifest.name}: license is "${manifest.license}", expected "Apache-2.0"`);
    }
    if (!manifest.scripts?.prepublishOnly) {
        fail(`${manifest.name}: missing "prepublishOnly" script; tarball could ship stale output`);
    }
    for (const script of FORBIDDEN_SCRIPTS) {
        if (manifest.scripts?.[script]) {
            fail(`${manifest.name}: has "${script}" script; consumers must not run build steps at install time`);
        }
    }
}

// --- 4. no published package may depend on a private workspace package -------

for (const { manifest } of publishable) {
    for (const [dep, range] of Object.entries(manifest.dependencies ?? {})) {
        if (!String(range).startsWith('workspace:')) continue;
        const target = byName.get(dep);
        if (!target) {
            fail(`${manifest.name}: depends on "${dep}" via workspace: protocol, but no such workspace package exists`);
        } else if (target.manifest.private === true) {
            fail(
                `${manifest.name}: runtime-depends on "${dep}", which is private and will never reach npm. ` +
                `Either publish "${dep}" or bundle it.`,
            );
        }
    }
}

// --- 5 & 6. pack each package and inspect the real tarball -------------------

const tarballDir = fs.mkdtempSync(path.join(os.tmpdir(), 'em-pack-'));

/** Files that must survive packing, derived from the manifest's entry points. */
const requiredEntries = (manifest) => {
    const entries = new Set();
    const add = (p) => {
        if (typeof p === 'string' && p.startsWith('./')) entries.add(p.slice(2));
        else if (typeof p === 'string' && !p.startsWith('.')) entries.add(p);
    };
    add(manifest.main);
    add(manifest.module);
    add(manifest.types);
    for (const target of Object.values(manifest.exports ?? {})) {
        if (typeof target === 'string') add(target);
        else for (const nested of Object.values(target ?? {})) add(nested);
    }
    for (const target of Object.values(manifest.bin ?? {})) add(target);
    return [...entries];
};

for (const { manifest } of publishable) {
    let stdout;
    try {
        stdout = execFileSync(
            'pnpm',
            ['--filter', manifest.name, 'pack', '--pack-destination', tarballDir],
            { cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
        );
    } catch (error) {
        fail(`${manifest.name}: pnpm pack failed\n${error.stderr ?? error.message}`);
        continue;
    }

    const tarball = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.endsWith('.tgz'))
        .pop();

    if (!tarball || !fs.existsSync(tarball)) {
        fail(`${manifest.name}: could not locate packed tarball (pack output: ${stdout.trim()})`);
        continue;
    }

    const listing = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf-8' })
        .split('\n')
        .filter(Boolean)
        .map((entry) => entry.replace(/^package\//, ''));

    for (const entry of requiredEntries(manifest)) {
        if (!listing.includes(entry)) {
            fail(
                `${manifest.name}: tarball is missing "${entry}", which package.json points at. ` +
                `Check the "files" allowlist and that the build ran.`,
            );
        }
    }

    // The packed manifest is what consumers actually install: workspace: and
    // file: specifiers must have been rewritten to real registry ranges.
    const packedManifestRaw = execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], {
        encoding: 'utf-8',
    });
    const packedManifest = JSON.parse(packedManifestRaw);
    for (const [dep, range] of Object.entries(packedManifest.dependencies ?? {})) {
        if (/^(workspace|file|link|portal):/.test(String(range))) {
            fail(`${manifest.name}: packed manifest still has unresolved dependency ${dep}@${range}`);
        }
    }

    console.log(
        `  ok  ${manifest.name}@${manifest.version} ` +
        `(${listing.length} files, ${(fs.statSync(tarball).size / 1024).toFixed(0)} KiB)`,
    );
}

fs.rmSync(tarballDir, { recursive: true, force: true });

if (errors.length > 0) {
    console.error(`\n${errors.length} problem(s) found:\n`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
}

console.log(
    `\nAll ${publishable.length} publishable packages verified at version ${[...versions][0]}.`,
);
