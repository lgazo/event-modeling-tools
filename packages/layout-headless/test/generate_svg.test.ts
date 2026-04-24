import { describe, test, beforeAll, expect } from "vitest";

import { EmptyFileSystem, type LangiumDocument } from "langium";
import { parseHelper } from "langium/test";
import { createEventModelingServices } from "event-modeling-language";

import type { EventModel } from 'event-modeling-language';
import { create_db } from "event-modeling-layout";
import { calculateBoxDimensions, write_svg } from "../src/headless.js";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { console_log } from "../src/console_log.js";

const silent_log = {
    debug: (..._args: unknown[]) => {},
    info: (..._args: unknown[]) => {},
    warn: (..._args: unknown[]) => {},
    error: (..._args: unknown[]) => {},
};

let services: ReturnType<typeof createEventModelingServices>;
let parse: ReturnType<typeof parseHelper<EventModel>>;
let document: LangiumDocument<EventModel> | undefined;

beforeAll(async () => {
    // console.error("BEFORE")
    services = createEventModelingServices(EmptyFileSystem);
    parse = parseHelper<EventModel>(services.EventModeling);
});

describe('Layout tests', () => {

    test('should create svg', async () => {
        const db = create_db({
            log: console_log,
            calculateBoxDimensions
        });

        const evml_names = [
            'multiple-source-frames',
            'translation-pattern',
            'resetting-flow',
            'data-block',
            'simple-block'
        ];

        if (!existsSync('./out/test')) {
            mkdirSync('./out/test');
        }
        evml_names.forEach(async (evml_name) => {
            const evml = readFileSync(`./test/${evml_name}.evml`).toString();
            document = await parse(evml);
            // console.log(`ast`, document.parseResult)
            db.setAst(document.parseResult.value);

            // const state = db.getState();
            // console.log(`state`, state);

            const svg_string = write_svg({ log: console_log })(document.parseResult.value);

            // const out_path = `./out/test/${evml_name}.emdsl.svg`;
            // writeFileSync(out_path, svg_string, 'utf-8');
            const snap = readFileSync(`./test/svg_snapshots/${evml_name}.emdsl.svg`)
            expect(snap.toString()).equals(svg_string);
        });
    });

    test('should render gwt scenarios grouped into columns under related timeframes', async () => {
        const evml = readFileSync('./test/gwt-scenarios.evml').toString();
        document = await parse(evml);
        expect(document.parseResult.parserErrors.length).toBe(0);

        const svg = write_svg({ log: silent_log })(document.parseResult.value);

        const columnCount = (svg.match(/class="em-gwt-column-group"/g) || []).length;
        expect(columnCount).toBe(2);

        const scenarioCount = (svg.match(/class="em-gwt-scenario"/g) || []).length;
        expect(scenarioCount).toBe(3);

        expect(svg).toContain('class="em-gwt-details"');
        expect(svg).toContain('happy path');
        expect(svg).toContain('duplicate add increments qty');
        expect(svg).toContain('audit');

        expect(svg).toContain('Given');
        expect(svg).toContain('When');
        expect(svg).toContain('Then');

        expect(svg).toMatch(/background:#ffb778/);
        expect(svg).toMatch(/background:#bcd6fe/);
        expect(svg).toMatch(/background:#d3f1a2/);
    });

    test('columns with horizontally overlapping x stack vertically', async () => {
        const evml = `eventmodeling
tf 01 cmd A
tf 02 cmd B
gwt 01 "one"
  given
    evt X
  then
    evt Y
gwt 02 "two"
  given
    evt X
  then
    evt Y
`;
        document = await parse(evml);
        expect(document.parseResult.parserErrors.length).toBe(0);
        const svg = write_svg({ log: silent_log })(document.parseResult.value);
        const ys = [...svg.matchAll(/class="em-gwt-column-group"[^>]*><foreignObject x="([\d.]+)" y="([\d.]+)"/g)]
            .map((m) => ({ x: parseFloat(m[1]), y: parseFloat(m[2]) }));
        expect(ys.length).toBe(2);
        const [a, b] = ys;
        const overlapsHorizontally = a.x < b.x + 220 && b.x < a.x + 220;
        if (overlapsHorizontally) {
            expect(Math.abs(a.y - b.y)).toBeGreaterThan(0);
        }
    });

    test('should not render gwt columns when none are defined', async () => {
        const evml = readFileSync('./test/simple-block.evml').toString();
        document = await parse(evml);
        const svg = write_svg({ log: silent_log })(document.parseResult.value);
        expect(svg).not.toContain('em-gwt-column');
    });
});
