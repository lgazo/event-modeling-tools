import type { EventModel } from 'event-modeling-language';
import type { EmFrame, EmDataEntity, EmGwt, EmGwtStatement } from 'event-modeling-language';
import { isEmResetFrame } from 'event-modeling-language';

import type {
  Box,
  Relation,
  Swimlane,
  SwimlaneProps,
  VisualProps,
  Command,
  Event,
  Deciders,
  Evolvers,
  Context,
  PositionFrame,
  PositionRelation,
  PositionGwtColumn,
  FramePositioned,
  RelationPositioned,
  GwtColumnPositioned,
  GwtScenario,
  GwtStatementBox,
  GwtSectionKind,
  TextProps,
  DiagramProps,
  EventModelingDatabase,
} from './types.js';
import {
  PositionFrameKind,
  PositionRelationKind,
  PositionGwtColumnKind,
  FramePositionedKind,
  RelationPositionedKind,
  GwtColumnPositionedKind,
} from './types.js';

import { LoggerDep } from './types_services.js';

export type CalculateBoxDimensions = (html: ContentElement[], props: { maxWidth: number }) => { width: number, height: number };

export type CalculateTextProps = (
  frame: EmFrame,
  dataEntities: EmDataEntity[],
  diagramProps: DiagramProps
) => TextProps;

export type CalculateTextPropsDep = LoggerDep & {
  calculateBoxDimensions: CalculateBoxDimensions;
};
export type Dependencies = LoggerDep & {
  calculateBoxDimensions: CalculateBoxDimensions;
};

interface EmStore {
  ast?: EventModel;
}

let store: EmStore = {};

export function reset_db(): void {
  store = {};
}

function extractName(entityIdentifier: string): string | undefined {
  const spl = entityIdentifier.split('.');
  if (spl.length === 2) {
    return spl[1];
  }
  return entityIdentifier;
}

function stripInlineValue(dataInlineValue: string): string {
  let toHtml = dataInlineValue;
  toHtml = toHtml.substring(toHtml.indexOf('{') + 1);
  toHtml = toHtml.substring(0, toHtml.lastIndexOf('}') - 1);
  return toHtml;
}

function stripBlockValue(value: string): string {
  let toHtml = value;
  toHtml = toHtml.substring(toHtml.indexOf('{\n') + 2);
  toHtml = toHtml.substring(0, toHtml.lastIndexOf('}') - 1);
  return toHtml;
}

export type ContentElement = {
  kind: 'b' | 'br' | 'code' | 'span',
  valueLines?: string[],
  params?: Record<string, string | number>
};

export const ContentElementStyles = {
  b: {
    fontFamily: 'sans-serif',
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'bold',
  },
  br: {
    fontFamily: 'sans-serif',
    fontSize: 12,
    fontWeight: 'normal',
    fontStyle: 'normal',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'normal',
    fontStyle: 'normal',
  },
  span: {
    fontFamily: 'sans-serif',
    fontSize: 12,
    fontWeight: 'normal',
    fontStyle: 'normal',
  },
}

function pre(contentElement: ContentElement): string {
  return `<pre style="text-align: left; ${contentElement.params?.maxWidth ? 'max-width: ' + contentElement.params.maxWidth + 'px' : ''}">`;
}
function tag(openTagName: string, closeTagName: string, contentElement: ContentElement): string[] {
  if (!contentElement.valueLines || contentElement.valueLines.length === 0) {
    return [];
  }
  if (contentElement.valueLines.length === 1) {
    return [`${openTagName}${contentElement.valueLines[0]}${closeTagName}`];
  }

  if (contentElement.valueLines.length === 1) {
    return [`${openTagName}${contentElement.valueLines[0]}`,
    `${contentElement.valueLines[1]}${closeTagName}`]
  }
  return [`${openTagName}${contentElement.valueLines[0]}`,
  ...contentElement.valueLines.slice(1, contentElement.valueLines.length - 1),
  `${contentElement.valueLines[contentElement.valueLines.length - 1]}${closeTagName}`]
}

function contentElementToHtml(contentElement: ContentElement): string[] {
  switch (contentElement.kind) {
    case 'b':
      return tag(`<b>`, `</b>`, contentElement);
    case 'br':
      return ['<br/>'];
    case 'code':
      return tag(pre(contentElement), `</pre>`, contentElement);
    case 'span':
      return tag(`<span>`, `</span>`, contentElement);
  }
}

const calculateTextProps = ({ log, calculateBoxDimensions }: CalculateTextPropsDep): CalculateTextProps => (
  frame: EmFrame,
  dataEntities: EmDataEntity[],
  diagramProps: DiagramProps
): TextProps => {
  const name = extractName(frame.entityIdentifier);

  let semanticContent: ContentElement[] = [{ kind: 'b', valueLines: [name || "<unnamed>"] }];

  if (frame.dataInlineValue) {

    const strippedInlineValue = stripInlineValue(frame.dataInlineValue);
    semanticContent.push({ kind: 'br' });
    semanticContent.push({ kind: 'code', valueLines: [strippedInlineValue] });
  }

  if (frame.dataReference) {
    const dataEntity = dataEntities.find(
      (dataEntity) => dataEntity.name === frame.dataReference?.$refText
    );

    if (dataEntity) {
      const strippedBlockValue = stripBlockValue(dataEntity.dataBlockValue);
      const lines = strippedBlockValue.split('\n');
      semanticContent.push({ kind: 'br' });
      semanticContent.push({ kind: 'code', valueLines: lines, params: { maxWidth: diagramProps.textMaxWidth } });
    }
  }

  const dimensions = calculateBoxDimensions(semanticContent, { maxWidth: 450 });

  const content = semanticContent.flatMap(contentElementToHtml).join('\n');

  const props = {
    content,
    width: dimensions.width,
    height: dimensions.height,
  };
  log.debug(`[${frame.name}] ${frame.entityIdentifier} text`, props);
  return props;
}

const stripQuotes = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
};

export const create_db = (deps: Dependencies): EventModelingDatabase => {
  const { log, calculateBoxDimensions } = deps;

  function getState(): Context {
    let state = initial;
    const { ast } = store;
    const diagramProps = getDiagramProps();

    if (!ast) {
      throw new Error('No data for EventModeling');
    }

    ast.frames.forEach((frame: EmFrame, index: number) => {
      const textProps = calculateTextProps({ log, calculateBoxDimensions })(frame, ast.dataEntities, diagramProps);

      state = dispatch(state, {
        $kind: PositionFrameKind,
        index,
        frame,
        textProps,
      });

      let sourceFrames = undefined;
      if (hasSourceFrame(frame)) {
        log.debug(`source frame`, frame.sourceFrames);
        sourceFrames = ast.frames.filter((currentFrame: EmFrame) => {
          //@ts-ignore: sf is Reference<EmFrame> but Reference is present in 'langium' package not available in `mermaid` package directly. We might want to re-export it from `parser`.
          return frame.sourceFrames.some((sf) => sf.$refText === currentFrame.name);
        });

        sourceFrames.forEach((sourceFrame: EmFrame) => {
          state = dispatch(state, {
            $kind: PositionRelationKind,
            index,
            frame,
            sourceFrame,
          });
        });
      } else {
        state = dispatch(state, {
          $kind: PositionRelationKind,
          index,
          frame,
        });
      }
    });

    state = {
      ...state,
      sortedSwimlanesArray: sortedSwimlanesArray(state.swimlanes),
    };

    if (ast.gwtEntities && ast.gwtEntities.length > 0) {
      const groups = new Map<string, { sourceBox: Box; gwts: EmGwt[] }>();
      for (const gwt of ast.gwtEntities) {
        const sourceFrameName = gwt.sourceFrame.$refText;
        const sourceBox = state.boxes.find((b) => b.frame.name === sourceFrameName);
        if (!sourceBox) {
          log.debug(`gwt references unknown frame ${sourceFrameName}`);
          continue;
        }
        let group = groups.get(sourceFrameName);
        if (!group) {
          group = { sourceBox, gwts: [] };
          groups.set(sourceFrameName, group);
        }
        group.gwts.push(gwt);
      }

      for (const [, group] of groups) {
        const scenarios: GwtScenario[] = group.gwts.map((gwt) => {
          const { statements, dimension } = calculateGwtScenarioProps({ log, calculateBoxDimensions })(gwt, ast.dataEntities, diagramProps);
          return { label: stripQuotes(gwt.label), statements, dimension };
        });

        const width = scenarios.reduce((m, s) => Math.max(m, s.dimension.width), diagramProps.gwtScenarioMinWidth);
        const height = scenarios.reduce((acc, s) => acc + s.dimension.height, 0)
          + Math.max(0, scenarios.length - 1) * diagramProps.gwtScenarioGap;

        state = dispatch(state, {
          $kind: PositionGwtColumnKind,
          sourceBox: group.sourceBox,
          scenarios,
          dimension: { width, height },
        });
      }
    }

    return state;
  }

  function setAst(ast: EventModel) {
    store.ast = ast;
  }

  const diagramProps = {
    swimlaneMinHeight: 70,
    swimlanePadding: 15,
    swimlaneGap: 10,
    boxPadding: 10,
    boxOverlap: 90,
    boxDefaultY: 0,
    boxMinWidth: 80,
    boxMaxWidth: 450,
    boxMinHeight: 80,
    boxMaxHeight: 750,
    contentStartX: 250,
    textMaxWidth: 450 - 2 * 10,
    boxTextFontWeight: 'bold',
    boxTextPadding: 10,
    swimlaneTextFontWeight: 'bold',
    labelUiAutomation: 'UI/Automation',
    labelUiAutomationPrefix: 'UI/A: ',
    labelCommandReadModel: 'Command/Read Model',
    labelCommandReadModelPrefix: 'C/RM: ',
    labelEvents: 'Events',
    labelEventsPrefix: 'Stream: ',
    gwtBandGap: 30,
    gwtScenarioPadding: 10,
    gwtScenarioGap: 15,
    gwtStatementGap: 6,
    gwtSectionLabelHeight: 20,
    gwtScenarioMinWidth: 220,
    gwtScenarioHeaderHeight: 28,
    gwtStatementVerticalPadding: 6,
    gwtDefaultScenarioLabel: 'Scenario',
  };

  function getDiagramProps(): DiagramProps {
    return diagramProps;
  }

  const initial: Context = {
    boxes: [],
    swimlanes: {},
    relations: [],
    gwtColumns: [],
    maxR: 0,
    maxY: 0,
    sortedSwimlanesArray: [],
  };

  function extractNamespace(entityIdentifier: string): string | undefined {
    const spl = entityIdentifier.split('.');
    if (spl.length === 2) {
      return spl[0];
    }
    return undefined;
  }


  function findSwimlaneByNamespace(
    swimlanes: Record<string, Swimlane>,
    namespace: string | undefined
  ): Swimlane | undefined {
    if (!namespace || namespace.length === 0) {
      return undefined;
    }
    return Object.values(swimlanes).find((swimlane) => swimlane.namespace === namespace);
  }

  function findNextAvailableIndex(
    swimlanes: Record<string, Swimlane>,
    boundaryMin: number,
    boundaryMax: number
  ): number {
    return (
      Math.max(
        boundaryMin,
        ...Object.keys(swimlanes)
          .filter((key) => {
            const index = Number.parseInt(key);
            return index > boundaryMin && index < boundaryMax;
          })
          .map((key) => Number.parseInt(key))
      ) + 1
    );
  }

  function calculateSwimlaneProps(
    frame: EmFrame,
    swimlanes: Record<string, Swimlane>
  ): SwimlaneProps {
    const namespace = extractNamespace(frame.entityIdentifier);
    const sw = findSwimlaneByNamespace(swimlanes, namespace);

    switch (frame.modelEntityType) {
      case 'ui':
      case 'pcr':
      case 'processor':
        if (sw) {
          return {
            index: sw.index,
            label: sw.namespace || diagramProps.labelUiAutomation,
          };
        } else if (namespace) {
          return {
            index: findNextAvailableIndex(swimlanes, 0, 100),
            label: diagramProps.labelUiAutomationPrefix + namespace,
          };
        }
        return { index: 0, label: diagramProps.labelUiAutomation };
      case 'rmo':
      case 'readmodel':
      case 'cmd':
      case 'command':
        if (sw) {
          return {
            index: sw.index,
            label: sw.namespace || diagramProps.labelCommandReadModel,
          };
        } else if (namespace) {
          return {
            index: findNextAvailableIndex(swimlanes, 100, 200),
            label: diagramProps.labelCommandReadModelPrefix + namespace,
          };
        }
        return { index: 100, label: diagramProps.labelCommandReadModel };
      case 'evt':
      case 'event':
      default:
        if (sw) {
          return {
            index: sw.index,
            label: sw.namespace || diagramProps.labelEvents,
          };
        } else if (namespace) {
          return {
            index: findNextAvailableIndex(swimlanes, 200, 300),
            label: diagramProps.labelEventsPrefix + namespace,
          };
        }
        return { index: 200, label: diagramProps.labelEvents };
    }
  }

  function calculateEntityVisualProps(frame: EmFrame): VisualProps {
    switch (frame.modelEntityType) {
      case 'ui':
        return {
          fill: 'white',
          stroke: '#dbdada',
        };
      case 'pcr':
      case 'processor':
        return {
          fill: '#edb3f6',
          stroke: '#b88cbf',
        };
      case 'rmo':
      case 'readmodel':
        return {
          fill: '#d3f1a2',
          stroke: '#a3b732',
        };
      case 'cmd':
      case 'command':
        return {
          fill: '#bcd6fe',
          stroke: '#679ac3',
        };
      case 'evt':
      case 'event':
        return {
          fill: '#ffb778',
          stroke: '#c19a0f',
        };
      default:
        return {
          fill: 'red',
          stroke: 'black',
        };
    }
  }


  function decidePositionFrame(state: Context, _command: Command): Event[] {
    const command = _command as PositionFrame;

    const visual = calculateEntityVisualProps(command.frame);
    const dimension = {
      width: command.textProps.width + 2 * diagramProps.boxTextPadding,
      height: command.textProps.height + 2 * diagramProps.boxTextPadding,
    };

    const event: FramePositioned = {
      $kind: FramePositionedKind,
      frame: command.frame,
      index: command.index,
      visual: visual,
      dimension,
      textProps: command.textProps,
    };
    return [event];
  }

  function calculateX(
    swimlane: Partial<Swimlane>,
    previousSwimlane: Swimlane | undefined,
    lastBox: Box | undefined
  ): number {
    // log.debug(`calculateX`, { previousSwimlane,swimlane:event.swimlane,r: swimlane.r,lbr:lastBox?.r});
    if (previousSwimlane === undefined) {
      return diagramProps.contentStartX;
    }
    if (previousSwimlane.index === swimlane.index && swimlane.r) {
      return swimlane.r + diagramProps.boxPadding;
    }

    if (lastBox === undefined) {
      return diagramProps.contentStartX;
    }

    return lastBox.r - diagramProps.boxOverlap + diagramProps.boxPadding;
  }

  function calculateMaxRight(swimlanes: Swimlane[], swimlaneR: number): number {
    const rs = [...swimlanes.map((s) => s.r), swimlaneR];
    return Math.max(...rs);
  }

  function sortedSwimlanesArray(swimlanes: Record<string, Swimlane>): Swimlane[] {
    return Object.values(swimlanes).sort((a, b) => a.index - b.index);
  }

  function evolveFramePositioned(state: Context, _event: Event): Context {
    const event: FramePositioned = _event as FramePositioned;

    const swimlaneProps = calculateSwimlaneProps(event.frame, state.swimlanes);

    // const { frame } = event;
    let swimlane: Swimlane;
    if (state.swimlanes.hasOwnProperty(swimlaneProps.index)) {
      swimlane = state.swimlanes[swimlaneProps.index];
    } else {
      swimlane = {
        index: swimlaneProps.index,
        label: swimlaneProps.label,
        r: 0,
        y: swimlaneProps.index * diagramProps.swimlaneMinHeight + diagramProps.swimlaneGap,
        height: diagramProps.swimlaneMinHeight,
        maxHeight: diagramProps.swimlaneMinHeight,
      };
    }
    // let previousSwimlane: Swimlane;
    // const previousSwimlaneIndex = event.swimlaneIndex - 1;
    // if (state.swimlanes.hasOwnProperty(previousSwimlaneIndex)) {
    //   previousSwimlane = state.swimlanes[previousSwimlaneIndex];
    // }

    const lastBox = state.boxes.length > 0 ? state.boxes[state.boxes.length - 1] : undefined;
    const previousSwimlane =
      state.previousSwimlaneNumber !== undefined
        ? state.swimlanes[state.previousSwimlaneNumber]
        : undefined;

    const dimension = {
      width:
        Math.max(
          diagramProps.boxMinWidth,
          Math.min(diagramProps.boxMaxWidth, event.dimension.width)
        ) +
        2 * diagramProps.boxPadding,
      height:
        Math.max(
          diagramProps.boxMinHeight,
          Math.min(diagramProps.boxMaxHeight, event.dimension.height)
        ) +
        2 * diagramProps.boxPadding,
    };

    const x = calculateX(swimlane, previousSwimlane, lastBox);
    const r = x + dimension.width + diagramProps.boxPadding;
    const maxR = calculateMaxRight(Object.values(state.swimlanes), r);

    swimlane.r = x + dimension.width;
    swimlane.maxHeight = Math.max(swimlane.maxHeight, dimension.height);
    swimlane.height =
      Math.max(diagramProps.swimlaneMinHeight, swimlane.maxHeight) + 2 * diagramProps.swimlanePadding;

    const box: Box = {
      x,
      y: diagramProps.swimlanePadding + swimlane.y,
      // y: diagramProps.swimlanePadding + (swimlane.y || diagramProps.boxDefaultY),
      r,
      dimension,
      leftSibling: false,
      swimlane: swimlane,
      visual: event.visual,
      text: event.textProps.content,
      frame: event.frame,
      index: event.index,
    };

    const newState = {
      ...state,
      boxes: [...state.boxes, box],
      swimlanes: {
        ...state.swimlanes,
        [`${swimlane.index}`]: swimlane,
      },
      previousSwimlaneNumber: swimlaneProps.index,
      previousFrame: event.frame,
      maxR,
    };

    /** the following swimlane.y recalculation is suboptimal. Additionally
     * the value of Box.y is not taken into account in rendering time.
     * This is fine for the time being, but maybe needs improvement later on.
     */
    const swimlanes = sortedSwimlanesArray(newState.swimlanes);
    if (swimlanes.length > 0) {
      swimlanes[0].y = 0;
    }
    for (let i = 1; i < swimlanes.length; i++) {
      const sw = swimlanes[i];
      const prevSw = swimlanes[i - 1];

      sw.y = prevSw.y + prevSw.height + diagramProps.swimlaneGap;
    }

    return newState;
  }

  function isFirstFrame(index: number, frame: EmFrame): boolean {
    if (index === 0 && frame.sourceFrames.length === 0) {
      return true;
    }
    return false;
  }

  function hasSourceFrame(frame: EmFrame): boolean {
    return (
      frame.sourceFrames !== undefined && frame.sourceFrames !== null && frame.sourceFrames.length > 0
    );
  }

  function findBoxByFrame(boxes: Box[], frame: EmFrame | undefined): Box | undefined {
    if (frame === undefined || frame === null) {
      return undefined;
    }
    return boxes.find((box) => box.frame.name === frame.name);
  }

  function findBoxByLineIndex(
    boxes: Box[],
    targetSwimlane: number,
    lineIndex: number
  ): Box | undefined {
    if (lineIndex < 0) {
      return undefined;
    }

    // boxes.find((box) => box.index === lineIndex);
    for (let i = lineIndex; i >= 0; i--) {
      const box = boxes[i];
      if (box.swimlane.index !== targetSwimlane) {
        return box;
      }
    }
    return undefined;
  }

  function decidePositionRelation(state: Context, _command: Command): Event[] {
    const command = _command as PositionRelation;

    if (isEmResetFrame(command.frame) || isFirstFrame(command.index, command.frame)) {
      return [];
    }

    const targetBox = findBoxByFrame(state.boxes, command.frame);

    if (targetBox === undefined) {
      throw new Error(`Target box not found for frame ${command.frame.name}`);
    }

    let sourceBox;
    if (command.sourceFrame) {
      sourceBox = findBoxByFrame(state.boxes, command.sourceFrame);
    } else {
      sourceBox = findBoxByLineIndex(state.boxes, targetBox.swimlane.index, command.index - 1);
    }

    if (sourceBox === undefined) {
      // Source box not found for frame ${command.frame.name}
      return [];
    }
    const event: RelationPositioned = {
      $kind: RelationPositionedKind,
      frame: command.frame,
      index: command.index,
      sourceBox,
      targetBox,
    };
    return [event];
  }

  const calculateGwtStatementProps = ({ log, calculateBoxDimensions }: CalculateTextPropsDep) => (
    stmt: EmGwtStatement,
    kind: GwtSectionKind,
    dataEntities: EmDataEntity[],
    diagramProps: DiagramProps,
  ): GwtStatementBox => {
    const name = extractName(stmt.entityIdentifier) || '<unnamed>';
    let semanticContent: ContentElement[] = [{ kind: 'b', valueLines: [name] }];

    if (stmt.dataInlineValue) {
      semanticContent.push({ kind: 'br' });
      const stripped = stripInlineValue(stmt.dataInlineValue);
      semanticContent.push({ kind: 'code', valueLines: [stripped] });
    } else if (stmt.dataBlockValue) {
      semanticContent.push({ kind: 'br' });
      const stripped = stripBlockValue(stmt.dataBlockValue);
      semanticContent.push({ kind: 'code', valueLines: stripped.split('\n'), params: { maxWidth: diagramProps.textMaxWidth } });
    }

    const dimensions = calculateBoxDimensions(semanticContent, { maxWidth: diagramProps.boxMaxWidth });
    const contentHtml = semanticContent.flatMap(contentElementToHtml).join('\n');
    const visual = calculateEntityVisualProps({ modelEntityType: stmt.modelEntityType } as EmFrame);

    log.debug(`gwt stmt`, { kind, name, dimensions });

    return {
      kind,
      modelEntityType: stmt.modelEntityType,
      entityIdentifier: stmt.entityIdentifier,
      contentHtml,
      dimension: {
        width: dimensions.width + 2 * diagramProps.boxTextPadding,
        height: dimensions.height + 2 * diagramProps.gwtStatementVerticalPadding,
      },
      visual,
    };
  };

  const calculateGwtScenarioProps = (dep: CalculateTextPropsDep) => (
    gwt: EmGwt,
    dataEntities: EmDataEntity[],
    diagramProps: DiagramProps,
  ): { statements: GwtStatementBox[]; dimension: { width: number; height: number } } => {
    const builder = calculateGwtStatementProps(dep);
    const statements: GwtStatementBox[] = [
      ...(gwt.givenStatements || []).map((s) => builder(s, 'given', dataEntities, diagramProps)),
      ...(gwt.whenStatements || []).map((s) => builder(s, 'when', dataEntities, diagramProps)),
      ...(gwt.thenStatements || []).map((s) => builder(s, 'then', dataEntities, diagramProps)),
    ];

    const sections: GwtSectionKind[] = [];
    for (const s of statements) {
      if (sections[sections.length - 1] !== s.kind) sections.push(s.kind);
    }

    const maxStmtWidth = statements.reduce((m, s) => Math.max(m, s.dimension.width), 0);
    const width = Math.max(diagramProps.gwtScenarioMinWidth, maxStmtWidth + 2 * diagramProps.gwtScenarioPadding);

    let innerHeight = 0;
    let currentKind: GwtSectionKind | undefined;
    for (const s of statements) {
      if (s.kind !== currentKind) {
        innerHeight += diagramProps.gwtSectionLabelHeight;
        currentKind = s.kind;
      }
      innerHeight += s.dimension.height + diagramProps.gwtStatementGap;
    }
    const height = diagramProps.gwtScenarioHeaderHeight + innerHeight + 2 * diagramProps.gwtScenarioPadding;

    return { statements, dimension: { width, height } };
  };

  function decidePositionGwtColumn(state: Context, _command: Command): Event[] {
    const command = _command as PositionGwtColumn;

    const swimlaneBottom = state.sortedSwimlanesArray.length > 0
      ? state.sortedSwimlanesArray[state.sortedSwimlanesArray.length - 1].y
        + state.sortedSwimlanesArray[state.sortedSwimlanesArray.length - 1].height
      : 0;
    const bandTopY = swimlaneBottom + diagramProps.gwtBandGap;

    const x = command.sourceBox.x;
    const width = command.dimension.width;
    const height = command.dimension.height;

    let y = bandTopY;
    let changed = true;
    while (changed) {
      changed = false;
      for (const other of state.gwtColumns) {
        const horizOverlap = x < other.x + other.dimension.width && other.x < x + width;
        if (!horizOverlap) continue;
        const vertOverlap = y < other.y + other.dimension.height && other.y < y + height;
        if (vertOverlap) {
          y = other.y + other.dimension.height + diagramProps.gwtScenarioGap;
          changed = true;
        }
      }
    }

    const event: GwtColumnPositioned = {
      $kind: GwtColumnPositionedKind,
      sourceFrameName: command.sourceBox.frame.name,
      scenarios: command.scenarios,
      dimension: command.dimension,
      x,
      y,
    };
    return [event];
  }

  function evolveGwtColumnPositioned(state: Context, _event: Event): Context {
    const event = _event as GwtColumnPositioned;

    const column = {
      sourceFrameName: event.sourceFrameName,
      x: event.x,
      y: event.y,
      dimension: event.dimension,
      scenarios: event.scenarios,
    };

    return {
      ...state,
      gwtColumns: [...state.gwtColumns, column],
      maxR: Math.max(state.maxR, event.x + event.dimension.width),
      maxY: Math.max(state.maxY, event.y + event.dimension.height),
    };
  }

  function evolveRelationPositioned(state: Context, _event: Event): Context {
    const event = _event as RelationPositioned;

    const relation: Relation = {
      visual: {
        fill: 'none',
        stroke: '#000',
      },
      source: {
        x: event.sourceBox.x,
        y: event.sourceBox.y,
      },
      target: {
        x: event.targetBox.x,
        y: event.targetBox.y,
      },
      sourceBox: event.sourceBox,
      targetBox: event.targetBox,
    };

    const newState = {
      ...state,
      relations: [...state.relations, relation],
    };
    return newState;
  }

  const deciders: Deciders = {
    [PositionFrameKind]: decidePositionFrame,
    [PositionRelationKind]: decidePositionRelation,
    [PositionGwtColumnKind]: decidePositionGwtColumn,
  };

  const evolvers: Evolvers = {
    [FramePositionedKind]: evolveFramePositioned,
    [RelationPositionedKind]: evolveRelationPositioned,
    [GwtColumnPositionedKind]: evolveGwtColumnPositioned,
  };

  function decide(state: Context, command: Command): Event[] {
    const fn = deciders[command.$kind];
    if (fn === undefined || fn === null) {
      return [];
    }

    const events = fn(state, command);
    log.debug(`decided events`, events);
    return events;
  }

  function evolve(state: Context, events: Event[]): Context {
    const newState = events.reduce((previousState, event) => {
      const fn = evolvers[event.$kind];
      if (fn === undefined || fn === null) {
        return previousState;
      }
      return fn(previousState, event);
    }, state);
    log.debug(`evolve events`, { state, newState, events });
    return newState;
  }

  function dispatch(state: Context, command: Command): Context {
    const events = decide(state, command);
    const newState = evolve(state, events);
    return newState;
  }

  return {
    setAst,

    getDiagramProps,
    getState,
  }
};
