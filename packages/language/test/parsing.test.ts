import { beforeAll, describe, expect, test } from "vitest";
import { EmptyFileSystem, type LangiumDocument } from "langium";
import { parseHelper } from "langium/test";
import { createEventModelingServices, EventModelingValidator } from "event-modeling-language";
import type { EmModelEntityType, EmTimeFrame, EventModel } from "event-modeling-language";
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

timeframe 02 ui UI
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

tf 02 ui UI
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

  test('should parse data block with nested braces', async () => {
    document = await parse(`eventmodeling
data Foo {
  a: {
    b: true
  }
}
`);
    expect(checkDocumentValid(document)).toBeUndefined();

    const { parseResult } = document;
    expect(parseResult.value.dataEntities.length).toBe(1);
    const entity = parseResult.value.dataEntities[0];
    expect(entity.name).toBe('Foo');
    const closeIdx = entity.dataBlockValue.lastIndexOf('}');
    const opens = (entity.dataBlockValue.slice(0, closeIdx + 1).match(/\{/g) || []).length;
    const closes = (entity.dataBlockValue.slice(0, closeIdx + 1).match(/\}/g) || []).length;
    expect(opens).toBe(closes);
    expect(opens).toBe(2);
  });

  test('should parse data block with deeply nested braces and siblings', async () => {
    document = await parse(`eventmodeling
data Bar {
  a: {
    b: {
      c: 1
    },
    d: 2
  }
}
`);
    expect(checkDocumentValid(document)).toBeUndefined();
    const entity = document.parseResult.value.dataEntities[0];
    expect(entity.name).toBe('Bar');
    expect(entity.dataBlockValue).toContain('d: 2');
    const opens = (entity.dataBlockValue.match(/\{/g) || []).length;
    const closes = (entity.dataBlockValue.match(/\}/g) || []).length;
    expect(opens).toBe(closes);
    expect(opens).toBe(3);
  });

  test('should parse inline payload with nested object containing string with brace', async () => {
    document = await parse(`eventmodeling
tf 01 evt Start
tf 07 evt X ->> 01 { "a": { "c": "}" }, "b": true }
`);
    expect(checkDocumentValid(document)).toBeUndefined();
    const frame = document.parseResult.value.frames[1];
    expect(frame.dataInlineValue).toBe('{ "a": { "c": "}" }, "b": true }');
  });

  test('should parse gwt statements with multiline nested data blocks', async () => {
    document = await parse(`eventmodeling
tf 01 evt Start
tf 02 evt Done

gwt 01 "nested gwt payloads"
  given
    evt Start \`jsobj\` {
      a: {
        b: {
          c: 1
        },
        d: 2
      }
    }
  when
    evt Done {
      outer: {
        inner: true
      }
    }
  then
    evt Done {
      result: {
        ok: "}"
      }
    }
`);
    expect(checkDocumentValid(document)).toBeUndefined();

    const gwt = document.parseResult.value.gwtEntities[0];
    expect(gwt.givenStatements.length).toBe(1);
    expect(gwt.whenStatements?.length).toBe(1);
    expect(gwt.thenStatements.length).toBe(1);

    const given = gwt.givenStatements[0];
    expect(given.entityIdentifier).toBe('Start');
    expect(given.dataType).toBe('jsobj');
    expect(given.dataBlockValue).toContain('d: 2');
    const givenOpens = (given.dataBlockValue!.match(/\{/g) || []).length;
    const givenCloses = (given.dataBlockValue!.match(/\}/g) || []).length;
    expect(givenOpens).toBe(givenCloses);
    expect(givenOpens).toBe(3);

    const when = gwt.whenStatements![0];
    expect(when.dataBlockValue).toContain('inner: true');

    const then = gwt.thenStatements[0];
    expect(then.dataBlockValue).toContain('ok: "}"');
  });

  test('should fail to parse unbalanced inline payload', async () => {
    document = await parse(`eventmodeling
tf 01 evt Start
tf 02 evt Bad ->> 01 { "a": { }
`);
    const errs = document.parseResult.parserErrors.length + document.parseResult.lexerErrors.length;
    expect(errs).toBeGreaterThan(0);
  });

  describe('Connection invariants validator', () => {
    const validator = new EventModelingValidator();

    function makeFrame(modelEntityType: EmModelEntityType): EmTimeFrame {
      return {
        $type: 'EmTimeFrame',
        $container: undefined as unknown as EmTimeFrame['$container'],
        $containerProperty: undefined,
        $containerIndex: undefined,
        $cstNode: undefined,
        name: '00',
        entityIdentifier: 'Test',
        modelEntityType,
        sourceFrames: [],
      };
    }

    function collectErrors(frame: EmTimeFrame, sources: EmTimeFrame[]): string[] {
      const errors: string[] = [];
      const frameWithSources: EmTimeFrame = {
        ...frame,
        sourceFrames: sources.map((s) => ({ $refText: s.name, ref: s, error: undefined })),
      };
      validator.checkSourceFrameTypes(frameWithSources, (_, message) => errors.push(message));
      return errors;
    }

    test('should allow evt sourced from cmd', () => {
      expect(collectErrors(makeFrame('evt'), [makeFrame('cmd')])).toHaveLength(0);
    });

    test('should allow event sourced from command', () => {
      expect(collectErrors(makeFrame('event'), [makeFrame('command')])).toHaveLength(0);
    });

    test('should reject evt sourced from rmo', () => {
      const errors = collectErrors(makeFrame('evt'), [makeFrame('rmo')]);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('event');
      expect(errors[0]).toContain('command');
    });

    test('should reject evt sourced from pcr', () => {
      expect(collectErrors(makeFrame('evt'), [makeFrame('pcr')])).toHaveLength(1);
    });

    test('should allow cmd sourced from ui', () => {
      expect(collectErrors(makeFrame('cmd'), [makeFrame('ui')])).toHaveLength(0);
    });

    test('should allow command sourced from processor', () => {
      expect(collectErrors(makeFrame('command'), [makeFrame('processor')])).toHaveLength(0);
    });

    test('should reject cmd sourced from cmd', () => {
      const errors = collectErrors(makeFrame('cmd'), [makeFrame('cmd')]);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('command');
      expect(errors[0]).toContain('ui or processor');
    });

    test('should reject cmd sourced from evt', () => {
      const errors = collectErrors(makeFrame('cmd'), [makeFrame('evt')]);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('ui or processor');
    });

    test('should allow rmo sourced from evt', () => {
      expect(collectErrors(makeFrame('rmo'), [makeFrame('evt')])).toHaveLength(0);
    });

    test('should reject rmo sourced from cmd', () => {
      const errors = collectErrors(makeFrame('readmodel'), [makeFrame('cmd')]);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('read model');
      expect(errors[0]).toContain('event');
    });

    test('should allow pcr sourced from rmo', () => {
      expect(collectErrors(makeFrame('pcr'), [makeFrame('rmo')])).toHaveLength(0);
    });

    test('should reject pcr sourced from cmd', () => {
      expect(collectErrors(makeFrame('processor'), [makeFrame('cmd')])).toHaveLength(1);
    });

    test('should allow ui sourced from rmo', () => {
      expect(collectErrors(makeFrame('ui'), [makeFrame('rmo')])).toHaveLength(0);
    });

    test('should reject ui sourced from evt', () => {
      const errors = collectErrors(makeFrame('ui'), [makeFrame('evt')]);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('ui');
      expect(errors[0]).toContain('read model');
    });

    test('should ignore frames without sources', () => {
      expect(collectErrors(makeFrame('cmd'), [])).toHaveLength(0);
    });
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

