#!/usr/bin/env node
/**
 * Regenerates the SVG snapshots asserted by test/generate_svg.test.ts.
 *
 *   pnpm --filter event-modeling-layout-headless run snapshots:update
 *
 * Run this only when a rendering change is intended, and read the resulting
 * git diff before committing — the snapshots are the only guard on the SVG
 * output, so blindly refreshing them defeats the test.
 *
 * Requires a current build: the renderer is imported from ../out.
 */

import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { createEventModelingServices } from 'event-modeling-language';
import { write_svg } from '../out/headless.js';
import { readFileSync, writeFileSync } from 'node:fs';

// Keep in sync with evml_names in test/generate_svg.test.ts.
const MODELS = [
    'multiple-source-frames',
    'translation-pattern',
    'resetting-flow',
    'data-block',
    'simple-block',
];

const silent = { debug() {}, info() {}, warn() {}, error() {} };
const services = createEventModelingServices(EmptyFileSystem);
const parse = parseHelper(services.EventModeling);

let changed = 0;
for (const name of MODELS) {
    const document = await parse(readFileSync(`./test/${name}.evml`).toString());
    const fresh = write_svg({ log: silent })(document.parseResult.value);
    const path = `./test/svg_snapshots/${name}.emdsl.svg`;
    const current = readFileSync(path).toString();
    if (current === fresh) {
        console.log(`  unchanged  ${name}`);
        continue;
    }
    writeFileSync(path, fresh, 'utf-8');
    const delta = fresh.length - current.length;
    console.log(`  UPDATED    ${name}  (${delta >= 0 ? '+' : ''}${delta} bytes)`);
    changed++;
}

console.log(
    changed === 0
        ? '\nAll snapshots already current.'
        : `\n${changed} snapshot(s) rewritten — review the diff before committing.`,
);
