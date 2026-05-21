import { describe, test, beforeAll, expect } from "vitest";

import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { createEventModelingServices } from "event-modeling-language";
import type { EventModel } from "event-modeling-language";
import { create_db } from "event-modeling-layout";

import { calculateBoxDimensions } from "../src/headless.js";

const silent_log = {
    debug: (..._args: unknown[]) => {},
    info: (..._args: unknown[]) => {},
    warn: (..._args: unknown[]) => {},
    error: (..._args: unknown[]) => {},
};

let services: ReturnType<typeof createEventModelingServices>;
let parse: ReturnType<typeof parseHelper<EventModel>>;

beforeAll(() => {
    services = createEventModelingServices(EmptyFileSystem);
    parse = parseHelper<EventModel>(services.EventModeling);
});

async function swimlaneLabelsFor(evml: string): Promise<string[]> {
    const document = await parse(evml);
    expect(document.parseResult.parserErrors.length).toBe(0);

    const db = create_db({ log: silent_log, calculateBoxDimensions });
    db.setAst(document.parseResult.value);

    return db.getState().sortedSwimlanesArray.map((swimlane) => swimlane.label);
}

describe("swimlane namespace grouping", () => {
    test("multiple events in the same namespace share one swimlane", async () => {
        const labels = await swimlaneLabelsFor(`eventmodeling
tf 01 evt Cart.ItemAdded
tf 02 evt Cart.ItemRemoved
`);
        expect(labels).toEqual(["Stream: Cart"]);
    });

    test("events in different namespaces get separate swimlanes", async () => {
        const labels = await swimlaneLabelsFor(`eventmodeling
tf 01 evt Cart.ItemAdded
tf 02 evt External.InventoryChanged
`);
        expect([...labels].sort()).toEqual(["Stream: Cart", "Stream: External"]);
    });

    test("the same namespace across bands gets one swimlane per band", async () => {
        const labels = await swimlaneLabelsFor(`eventmodeling
tf 01 cmd Cart.AddItem
tf 02 evt Cart.ItemAdded
`);
        expect([...labels].sort()).toEqual(["C/RM: Cart", "Stream: Cart"]);
    });
});
