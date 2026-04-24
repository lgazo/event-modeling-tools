import type { EmFrame, EventModel } from 'event-modeling-language';

export type EventModelingDatabase = {
  setAst: (ast: EventModel) => void;

  getDiagramProps: () => DiagramProps;
  getState: () => Context;
}

export interface DiagramProps {
  swimlaneMinHeight: number;
  swimlanePadding: number;
  swimlaneGap: number;
  boxPadding: number;
  boxOverlap: number;
  boxDefaultY: number;
  boxMinWidth: number;
  boxMaxWidth: number;
  boxMinHeight: number;
  boxMaxHeight: number;
  contentStartX: number;
  textMaxWidth: number;
  boxTextFontWeight: string;
  boxTextPadding: number;
  swimlaneTextFontWeight: string;
  labelUiAutomation: string;
  labelUiAutomationPrefix: string;
  labelCommandReadModel: string;
  labelCommandReadModelPrefix: string;
  labelEvents: string;
  labelEventsPrefix: string;
  gwtBandGap: number;
  gwtScenarioPadding: number;
  gwtScenarioGap: number;
  gwtStatementGap: number;
  gwtSectionLabelHeight: number;
  gwtScenarioMinWidth: number;
  gwtScenarioHeaderHeight: number;
  gwtStatementVerticalPadding: number;
  gwtDefaultScenarioLabel: string;
}

/**
 * Visual
 */

export interface Dimension {
  width: number;
  height: number;
}

export interface Coordinate {
  x: number;
  y: number;
}

export type Color = string;

export interface VisualProps {
  fill: Color;
  stroke: Color;
}

export interface TextProps {
  content: string;
  width: number;
  height: number;
}

export interface Box {
  r: number;
  x: number;
  /** This has no meaning for the time being. It is calculated from Swimlane.y ATM. */
  y: number;
  dimension: Dimension;
  leftSibling: boolean;
  swimlane: Swimlane;
  visual: VisualProps;
  text: string;
  frame: EmFrame;
  /** Line index */
  index: number;
}

export interface SwimlaneProps {
  index: number;
  label: string;
  namespace?: string;
}

export type Swimlane = {
  r: number;
  y: number;
  height: number;
  maxHeight: number;
} & SwimlaneProps;

export interface Relation {
  visual: VisualProps;
  source: Coordinate;
  target: Coordinate;
  sourceBox: Box;
  targetBox: Box;
}

export type GwtSectionKind = 'given' | 'when' | 'then';

export interface GwtStatementBox {
  kind: GwtSectionKind;
  modelEntityType: string;
  entityIdentifier: string;
  contentHtml: string;
  dimension: Dimension;
  visual: VisualProps;
}

export interface GwtScenario {
  label?: string;
  dimension: Dimension;
  statements: GwtStatementBox[];
}

export interface GwtColumn {
  sourceFrameName: string;
  x: number;
  y: number;
  dimension: Dimension;
  scenarios: GwtScenario[];
}

export interface Context {
  boxes: Box[];
  swimlanes: Record<string, Swimlane>;
  relations: Relation[];
  gwtColumns: GwtColumn[];
  previousFrame?: EmFrame;
  previousSwimlaneNumber?: number;
  maxR: number;
  maxY: number;
  sortedSwimlanesArray: Swimlane[];
}

/**
 * Commands & Events
 */

export const PositionFrameKind = 'position frame';
export type PositionFrame = {
  index: number;
  frame: EmFrame;
  textProps: TextProps;
} & CommandBase;

export const FramePositionedKind = 'frame positioned';
export type FramePositioned = {
  index: number;
  frame: EmFrame;
  visual: VisualProps;
  dimension: Dimension;
  textProps: TextProps;
} & EventBase;

export const PositionRelationKind = 'position relation';
export type PositionRelation = {
  index: number;
  frame: EmFrame;
  sourceFrame?: EmFrame;
} & CommandBase;

export const RelationPositionedKind = 'relation positioned';
export type RelationPositioned = {
  index: number;
  frame: EmFrame;
  sourceBox: Box;
  targetBox: Box;
} & EventBase;

export const PositionGwtColumnKind = 'position gwt column';
export type PositionGwtColumn = {
  sourceBox: Box;
  scenarios: GwtScenario[];
  dimension: Dimension;
} & CommandBase;

export const GwtColumnPositionedKind = 'gwt column positioned';
export type GwtColumnPositioned = {
  sourceFrameName: string;
  scenarios: GwtScenario[];
  dimension: Dimension;
  x: number;
  y: number;
} & EventBase;

/**
 * Decider & Event Sourcing support
 */

export type Command = PositionFrame | PositionRelation | PositionGwtColumn;
export type Event = FramePositioned | RelationPositioned | GwtColumnPositioned;
export interface CommandBase {
  $kind: string;
}
export interface EventBase {
  $kind: string;
}

export type DecideFn = (state: Context, command: Command) => Event[];
export type EvolveFn = (state: Context, event: Event) => Context;

export type Deciders = Record<string, DecideFn>;
export type Evolvers = Record<string, EvolveFn>;
