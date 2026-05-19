import { create_db, buildGwtColumnHtml, escapeHtml } from 'event-modeling-layout';
import type { Box, Relation, Swimlane, GwtColumn, Context, DiagramProps } from 'event-modeling-layout';
import type { EventModel, EmFrame, EmDataEntity } from 'event-modeling-language';
import { LoggerDep } from 'event-modeling-layout';
import { calculateBoxDimensions } from './headless.js';

function canonicalEntity(modelEntityType: string): string {
  switch (modelEntityType) {
    case 'ui':
      return 'ui';
    case 'pcr':
    case 'processor':
      return 'processor';
    case 'rmo':
    case 'readmodel':
      return 'readmodel';
    case 'cmd':
    case 'command':
      return 'command';
    case 'evt':
    case 'event':
      return 'event';
    default:
      return modelEntityType;
  }
}

function contentTypeFor(modelEntityType: string): string {
  switch (canonicalEntity(modelEntityType)) {
    case 'ui':
      return 'image/ascii-art';
    case 'processor':
      return 'text/markdown';
    case 'event':
    case 'readmodel':
    case 'command':
      return 'application/schema+yaml';
    default:
      return 'text/plain';
  }
}

function isContainer(modelEntityType: string): boolean {
  const c = canonicalEntity(modelEntityType);
  return c === 'ui' || c === 'processor';
}

function attr(name: string, value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  return ` ${name}="${escapeHtml(String(value))}"`;
}

function styleString(pairs: Record<string, string | number | undefined>): string {
  return Object.entries(pairs)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join(';') + ';';
}

function stripInlineValue(value: string): string {
  let v = value;
  v = v.substring(v.indexOf('{') + 1);
  v = v.substring(0, v.lastIndexOf('}'));
  return v.trim();
}

function stripBlockValue(value: string): string {
  let v = value;
  v = v.substring(v.indexOf('{\n') + 2);
  v = v.substring(0, v.lastIndexOf('}'));
  return v.replace(/\n+$/, '');
}

function extractRichContent(frame: EmFrame, dataEntities: EmDataEntity[]): string | undefined {
  if (frame.dataInlineValue) {
    return stripInlineValue(frame.dataInlineValue);
  }
  if (frame.dataReference) {
    const ref = frame.dataReference.$refText;
    const de = dataEntities.find((d) => d.name === ref);
    if (de) {
      return stripBlockValue(de.dataBlockValue);
    }
  }
  return undefined;
}

function buildBoxLabel(frame: EmFrame, dataEntities: EmDataEntity[]): string {
  const markdown = canonicalEntity(frame.modelEntityType) === 'processor';
  const header = markdown ? '**%em_name%**' : '<b>%em_name%</b>';
  const content = extractRichContent(frame, dataEntities);
  if (!content) return header;
  if (markdown) {
    return `${header}\n\n${content}`;
  }
  const contentLines = content
    .split('\n')
    .map((line) => escapeHtml(line))
    .join('<br/>');
  return `${header}<br/>${contentLines}`;
}

function extractNamespace(frame: EmFrame): string | undefined {
  const parts = frame.entityIdentifier.split('.');
  return parts.length === 2 ? parts[0] : undefined;
}

function extractName(frame: EmFrame): string {
  const parts = frame.entityIdentifier.split('.');
  return parts.length === 2 ? parts[1] : frame.entityIdentifier;
}

function renderSwimlaneCell(swimlane: Swimlane, id: string, parentId: string, totalWidth: number): string {
  const style = styleString({
    rounded: 0,
    whiteSpace: 'wrap',
    html: 1,
    fillColor: '#fafafa',
    strokeColor: '#f0f0f0',
    align: 'left',
    verticalAlign: 'top',
    spacingLeft: 20,
    spacingTop: 10,
    fontStyle: 1,
    fontSize: 12,
  });
  const label = escapeHtml(swimlane.label);
  return `<object${attr('id', id)} label="${label}" em_entity="swimlane" em_swimlane_index="${swimlane.index}">`
    + `<mxCell style="${style}" vertex="1" parent="${escapeHtml(parentId)}">`
    + `<mxGeometry x="0" y="${swimlane.y}" width="${totalWidth}" height="${swimlane.height}" as="geometry"/>`
    + `</mxCell>`
    + `</object>`;
}

function renderBoxCell(
  box: Box,
  id: string,
  parentId: string,
  diagramProps: DiagramProps,
  dataEntities: EmDataEntity[],
): string {
  const entity = canonicalEntity(box.frame.modelEntityType);
  const container = isContainer(box.frame.modelEntityType);
  const style = styleString({
    rounded: 0,
    whiteSpace: 'wrap',
    html: 1,
    fillColor: box.visual.fill,
    strokeColor: box.visual.stroke,
    align: 'center',
    verticalAlign: container ? 'top' : 'middle',
    spacing: 6,
    fontSize: 12,
    container: container ? 1 : undefined,
    collapsible: container ? 0 : undefined,
  });
  const y = box.swimlane.y + diagramProps.swimlanePadding;
  const label = escapeHtml(buildBoxLabel(box.frame, dataEntities));
  const ns = extractNamespace(box.frame);
  const name = extractName(box.frame);
  return `<object${attr('id', id)} label="${label}" placeholders="1" em_entity="${entity}"`
    + attr('em_entity_type', box.frame.modelEntityType)
    + attr('content-type', contentTypeFor(box.frame.modelEntityType))
    + attr('em_frame_name', box.frame.name)
    + attr('em_frame_kind', box.frame.$type === 'EmResetFrame' ? 'reset' : 'time')
    + attr('em_identifier', box.frame.entityIdentifier)
    + attr('em_namespace', ns)
    + attr('em_name', name)
    + `>`
    + `<mxCell style="${style}" vertex="1" parent="${escapeHtml(parentId)}">`
    + `<mxGeometry x="${box.x}" y="${y}" width="${box.dimension.width}" height="${box.dimension.height}" as="geometry"/>`
    + `</mxCell>`
    + `</object>`;
}

function renderRelationCell(
  relation: Relation,
  id: string,
  parentId: string,
  sourceId: string,
  targetId: string,
): string {
  const style = styleString({
    edgeStyle: 'none',
    rounded: 0,
    html: 1,
    endArrow: 'block',
    endFill: 1,
    strokeColor: relation.visual.stroke,
    fontSize: 11,
  });
  return `<object${attr('id', id)} em_entity="relation">`
    + `<mxCell style="${style}" edge="1" parent="${escapeHtml(parentId)}"`
    + ` source="${escapeHtml(sourceId)}" target="${escapeHtml(targetId)}">`
    + `<mxGeometry relative="1" as="geometry"/>`
    + `</mxCell>`
    + `</object>`;
}

function renderGwtColumnCell(column: GwtColumn, id: string, parentId: string): string {
  const style = styleString({
    rounded: 0,
    whiteSpace: 'wrap',
    html: 1,
    fillColor: '#ffffff',
    strokeColor: '#bbbbbb',
    align: 'left',
    verticalAlign: 'top',
    spacing: 6,
    fontSize: 11,
    overflow: 'fill',
  });
  const labelHtml = escapeHtml(buildGwtColumnHtml(column));
  return `<object${attr('id', id)} label="${labelHtml}" em_entity="gwt_column"`
    + attr('em_source_frame', column.sourceFrameName)
    + attr('em_scenario_count', column.scenarios.length)
    + `>`
    + `<mxCell style="${style}" vertex="1" parent="${escapeHtml(parentId)}">`
    + `<mxGeometry x="${column.x}" y="${column.y}" width="${column.dimension.width}" height="${column.dimension.height}" as="geometry"/>`
    + `</mxCell>`
    + `</object>`;
}

function computeCanvas(state: Context, diagramProps: DiagramProps): { width: number; height: number } {
  const minWidth = diagramProps.contentStartX + diagramProps.boxMinWidth + 3 * diagramProps.boxPadding;
  const width = Math.max(state.maxR, minWidth);
  const swimlanes = state.sortedSwimlanesArray;
  const swimlanesHeight = swimlanes.length > 0
    ? swimlanes[swimlanes.length - 1].y + swimlanes[swimlanes.length - 1].height
    : diagramProps.swimlaneMinHeight + 2 * diagramProps.swimlanePadding;
  const height = Math.max(swimlanesHeight, state.maxY);
  return { width, height };
}

export const write_drawio = (deps: LoggerDep) => (
  model: EventModel,
): string => {
  const db = create_db({ ...deps, calculateBoxDimensions });
  db.setAst(model);
  const state = db.getState();
  const diagramProps = db.getDiagramProps();
  const { width, height } = computeCanvas(state, diagramProps);
  const dataEntities = model.dataEntities ?? [];

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push(`<mxfile host="event-modeling-tools" type="device">`);
  parts.push(`<diagram id="event-model" name="Event Model">`);
  parts.push(
    `<mxGraphModel dx="${width}" dy="${height}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${width}" pageHeight="${height}" math="0" shadow="0">`
  );
  parts.push('<root>');
  parts.push('<mxCell id="0"/>');
  parts.push('<mxCell id="1" parent="0"/>');

  state.sortedSwimlanesArray.forEach((sw, idx) => {
    parts.push(renderSwimlaneCell(sw, `sw-${idx}`, '1', width));
  });

  const boxIds = new Map<EmFrame, string>();
  state.boxes.forEach((box, idx) => {
    const id = `box-${idx}`;
    boxIds.set(box.frame, id);
    parts.push(renderBoxCell(box, id, '1', diagramProps, dataEntities));
  });

  state.relations.forEach((rel, idx) => {
    const sourceId = boxIds.get(rel.sourceBox.frame);
    const targetId = boxIds.get(rel.targetBox.frame);
    if (!sourceId || !targetId) return;
    parts.push(renderRelationCell(rel, `rel-${idx}`, '1', sourceId, targetId));
  });

  state.gwtColumns.forEach((col, idx) => {
    parts.push(renderGwtColumnCell(col, `gwt-${idx}`, '1'));
  });

  parts.push('</root>');
  parts.push('</mxGraphModel>');
  parts.push('</diagram>');
  parts.push('</mxfile>');

  return parts.join('\n');
};
