import { beforeAll, describe, expect, test } from "vitest";
import { EmptyFileSystem, type LangiumDocument } from "langium";
import { parseHelper } from "langium/test";
import { createEventModelingServices } from "event-modeling-language";
import type { EventModel } from "event-modeling-language";
import { checkDocumentValid } from "./utils.js"; 

let services: ReturnType<typeof createEventModelingServices>;
let parse:    ReturnType<typeof parseHelper<EventModel>>;
let document: LangiumDocument<EventModel> | undefined;

beforeAll(async () => {
    services = createEventModelingServices(EmptyFileSystem);
    parse = parseHelper<EventModel>(services.EventModeling);

    // activate the following if your linking test requires elements from a built-in library, for example
    // await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
});

describe('Parsing tests', () => {

  test('should parse complex model', async () => {
    document = await parse(`eventmodeling
tf 01 cmd UpdateCartCommand
tf 02 evt CartUpdatedEvent ->> 01 \`jsobj\`{ a: b }
tf 03 rmo CartItemsReadModel ->> 02 [[CartItemsReadModel03]]
tf 04 evt ProductDescriptionUpdatedEvent ->> 01 \`jsobj\`{ a: { c: d } }
tf 05 evt ProductTitleUpdatedEvent ->> 01 { "a": { "c": true } }
tf 06 evt ProductCountIncrementedEvent ->> 01 \`json\`" { "a": { "c": true } } "

data CartItemsReadModel03 {
  { a: b }
}

data NotAssignedData02 \`jsobj\` {
  { a: {
    d: true
  }}
}

data AnotherNotAssignedData06 {
  a: 'abc'
}

note 02 \`md\` {
    # head 1
    this is markdown note
}

note 05 {
  This is whatever <b>you</b> want
  On multiple lines
}

gwt 01 "user adds item to cart"
  given
    evt CartUpdatedEvent { a: true, b: "abc" }
    evt CartUpdatedEvent
  when
    evt ProductDescriptionUpdatedEvent {
      a: true,
      "b": "hello"
    }
    evt ProductTitleUpdatedEvent
  then
    evt ProductTitleUpdatedEvent


gwt 03 'cart already populated'
  given
    evt CartUpdatedEvent
    evt ProductTitleUpdatedEvent
  then
    evt ProductTitleUpdatedEvent
    evt CartUpdatedEvent
`);


    expect(checkDocumentValid(document)).toBeUndefined();

    const { parseResult } = document;
    // console.error('Eventmodeling', parseResult.value);
    expect(parseResult.value.frames.length).toBe(6);
    expect(parseResult.value.dataEntities.length).toBe(3);
    expect(parseResult.value.noteEntities.length).toBe(2);
    expect(parseResult.value.gwtEntities.length).toBe(2);
    expect(parseResult.value.gwtEntities[0].label).toBe('"user adds item to cart"');
    expect(parseResult.value.gwtEntities[1].label).toBe("'cart already populated'");
  });

  test('should parse gwt without label', async () => {
    document = await parse(`eventmodeling
tf 01 evt Start

gwt 01
  given
    evt Start
  then
    evt Start
`);
    expect(checkDocumentValid(document)).toBeUndefined();

    const { parseResult } = document;
    expect(parseResult.value.gwtEntities.length).toBe(1);
    expect(parseResult.value.gwtEntities[0].label).toBeUndefined();
  });


  test('should parse simple model', async () => {
    document = await parse(`eventmodeling
timeframe 01 event Start

  `);
    expect(checkDocumentValid(document)).toBeUndefined();

    const { parseResult } = document;
    // console.error('Eventmodeling', parseResult.value);
    expect(parseResult.value.frames.length).toBe(1);
    const frame = parseResult.value.frames[0];
    expect(frame.name).toBe('01');
    expect(frame.modelEntityType).toBe('event');
    expect(frame.entityIdentifier).toBe('Start');
  });

  test('should parse qualified names in model', async () => {
    document = await parse(`eventmodeling

timeframe 02 screen Screen
tf 01 evt Product.PriceChanged
tf 03 evt Cart.ItemAdded

  `);
    expect(checkDocumentValid(document)).toBeUndefined();

    const { parseResult } = document;
    // console.error('Eventmodeling', parseResult.value);
    expect(parseResult.value.frames.length).toBe(3);
    const frame = parseResult.value.frames[1];
    expect(frame.name).toBe('01');
    expect(frame.modelEntityType).toBe('evt');
    expect(frame.entityIdentifier).toBe('Product.PriceChanged');
  });

  test('should parse both types of frames in model', async () => {
    document = await parse(`eventmodeling

tf 02 screen Screen
resetframe 01 evt Product.PriceChanged
tf 03 evt Cart.ItemAdded

  `);
    expect(checkDocumentValid(document)).toBeUndefined();

    const { parseResult } = document;
    // console.error('Eventmodeling', parseResult.value);
    expect(parseResult.value.frames.length).toBe(3);
    const frame = parseResult.value.frames[1];
    // console.error('Eventmodeling', frame);
    expect(frame.$type).toBe('EmResetFrame');
    expect(frame.name).toBe('01');
    expect(frame.modelEntityType).toBe('evt');
    expect(frame.entityIdentifier).toBe('Product.PriceChanged');
  });

  test('should parse multiple source frames model', async () => {
    document = await parse(`eventmodeling
tf 01 evt Start
tf 02 evt End
rf 03 readmodel ReadModel01 ->> 01 ->> 02 { a: true }
rf 04 rmo ReadModel02 ->> 01 ->> 02
  `);
    expect(checkDocumentValid(document)).toBeUndefined();

    const { parseResult } = document;
    // console.error('Eventmodeling', parseResult.value);
    expect(parseResult.value.frames.length).toBe(4);
    let frame = parseResult.value.frames[2];
    // console.error('Eventmodeling', frame);
    expect(frame.name).toBe('03');
    expect(frame.modelEntityType).toBe('readmodel');
    expect(frame.sourceFrames.length).toBe(2);

    frame = parseResult.value.frames[3];
    expect(frame.name).toBe('04');
    expect(frame.modelEntityType).toBe('rmo');
    expect(frame.sourceFrames.length).toBe(2);
  });
});

