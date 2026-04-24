import type { BaseType, Selection } from 'd3';

import type { Box, Relation, Swimlane, DiagramProps, Context, GwtScenario, GwtColumn, GwtSectionKind } from './types.js';

export type D3Diagram = Selection<BaseType, unknown, HTMLElement, any>;

function renderD3Box(
  diagram: D3Diagram,
  diagramProps: DiagramProps
) {
  return (box: Box) => {
    const y = box.swimlane.y + diagramProps.swimlanePadding;

    const g = diagram.append('g').attr('class', 'em-box');

    g.append('rect')
      .attr('x', box.x)
      .attr('y', y)
      .attr('rx', '3')
      .attr('width', box.dimension.width)
      .attr('height', box.dimension.height)
      .attr('stroke', box.visual.stroke)
      .attr('fill', box.visual.fill);
    // .attr('stroke', '#000');

    // g.append('text')
    //   .attr('font-weight', diagramProps.boxTextFontWeight)
    //   .attr('x', box.x + 10)
    //   .attr('y', box.y + 20)
    //   .text(box.text);

    const f = g
      .append('foreignObject')
      .attr('x', box.x + diagramProps.boxPadding)
      .attr('y', y + 10)
      .attr('width', box.dimension.width - 2 * diagramProps.boxPadding)
      .attr('height', box.dimension.height - 2 * diagramProps.boxPadding);

    const text = f
      .append('xhtml:div')
      .style('display', 'table')
      .style('height', '100%')
      .style('width', '100%');

    text
      .append('span')
      .style('display', 'table-cell')
      .style('text-align', 'center')
      .style('vertical-align', 'middle')
      .html(box.text);
  };
}

function dirUpwards(sourceY: number, targetY: number): boolean {
  return sourceY > targetY;
}

function renderD3Relation(
  diagram: Selection<BaseType, unknown, HTMLElement, any>,
  diagramProps: DiagramProps
) {
  return (relation: Relation) => {
    const sourceBoxY = relation.sourceBox.swimlane.y + diagramProps.swimlanePadding;
    const targetBoxY = relation.targetBox.swimlane.y + diagramProps.swimlanePadding;

    const upwards = dirUpwards(sourceBoxY, targetBoxY);

    const sourceX = relation.sourceBox.x + (relation.sourceBox.dimension.width * 2) / 3;
    const targetX = relation.targetBox.x + relation.targetBox.dimension.width / 3;

    let sourceY;
    let targetY;

    // log.debug(`rendering relation up=${upwards} for `, {
    //   sourceBox: relation.sourceBox,
    //   targetBox: relation.targetBox,
    // });
    if (upwards) {
      sourceY = sourceBoxY;
      targetY = targetBoxY + relation.targetBox.dimension.height;
    } else {
      sourceY = sourceBoxY + relation.sourceBox.dimension.height;
      targetY = targetBoxY;
    }

    diagram
      .append('path')
      .attr('class', 'em-relation')
      .attr('fill', relation.visual.fill)
      .attr('stroke', relation.visual.stroke)
      .attr('stroke-width', '1')
      .attr('marker-end', 'url(#arrowhead)')
      .attr('d', `M${sourceX} ${sourceY} L${targetX} ${targetY}`);
  };
}

function sectionLabel(kind: GwtSectionKind): string {
  if (kind === 'given') return 'Given';
  if (kind === 'when') return 'When';
  return 'Then';
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildGwtScenarioHtml(scenario: GwtScenario, sourceFrameName: string): string {
  const summary = escapeHtml(scenario.label || 'Scenario');
  const source = escapeHtml(sourceFrameName);

  let body = '';
  let currentKind: GwtSectionKind | undefined;
  for (const stmt of scenario.statements) {
    if (stmt.kind !== currentKind) {
      if (currentKind !== undefined) body += '</div>';
      body += `<div class="em-gwt-section"><div class="em-gwt-section-label">${sectionLabel(stmt.kind)}</div>`;
      currentKind = stmt.kind;
    }
    body += `<div class="em-gwt-statement" style="background:${stmt.visual.fill};border:1px solid ${stmt.visual.stroke};">${stmt.contentHtml}</div>`;
  }
  if (currentKind !== undefined) body += '</div>';

  return `<details class="em-gwt-details" open="open">`
    + `<summary class="em-gwt-summary"><span class="em-gwt-frame-ref">${source}</span> ${summary}</summary>`
    + `<div class="em-gwt-body">${body}</div>`
    + `</details>`;
}

function buildGwtColumnHtml(column: GwtColumn): string {
  const scenarios = column.scenarios
    .map((s) => `<div class="em-gwt-scenario">${buildGwtScenarioHtml(s, column.sourceFrameName)}</div>`)
    .join('');
  return `<div class="em-gwt-column" xmlns="http://www.w3.org/1999/xhtml">${scenarios}</div>`;
}

function renderD3GwtColumn(
  diagram: Selection<BaseType, unknown, HTMLElement, any>,
  _diagramProps: DiagramProps,
) {
  return (column: GwtColumn) => {
    const g = diagram.append('g')
      .attr('class', 'em-gwt-column-group')
      .attr('data-gwt-orig-y', column.y);
    const f = g
      .append('foreignObject')
      .attr('x', column.x)
      .attr('y', column.y)
      .attr('width', column.dimension.width)
      .attr('height', column.dimension.height);

    f.append('xhtml:div')
      .attr('class', 'em-gwt-column-root')
      .html(buildGwtColumnHtml(column));
  };
}

export const GWT_RELAYOUT_JS = `var gap = parseFloat(svg.getAttribute('data-gwt-scenario-gap')) || 10;
var bandTop = parseFloat(svg.getAttribute('data-gwt-band-top-y')) || 0;
var baseW = parseFloat(svg.getAttribute('data-gwt-base-width')) || parseFloat(svg.getAttribute('width')) || 0;
var baseH = parseFloat(svg.getAttribute('data-gwt-base-height')) || parseFloat(svg.getAttribute('height')) || 0;
function relayout(){
  var groups = Array.prototype.slice.call(svg.querySelectorAll('.em-gwt-column-group'));
  if (groups.length === 0) return;
  var items = groups.map(function(g, i){
    var fo = g.querySelector('foreignObject');
    var root = fo && fo.firstElementChild;
    var measured = 0;
    if (root) {
      if (root.getBoundingClientRect) measured = root.getBoundingClientRect().height || 0;
      if (!measured && root.scrollHeight) measured = root.scrollHeight;
    }
    return {
      fo: fo,
      x: parseFloat(fo.getAttribute('x')) || 0,
      w: parseFloat(fo.getAttribute('width')) || 0,
      origY: parseFloat(g.getAttribute('data-gwt-orig-y')) || 0,
      i: i, h: measured, y: 0
    };
  });
  var order = items.slice().sort(function(a, b){ return (a.origY - b.origY) || (a.i - b.i); });
  var placed = [];
  for (var k = 0; k < order.length; k++){
    var it = order[k];
    var y = bandTop;
    var changed = true;
    while (changed){
      changed = false;
      for (var j = 0; j < placed.length; j++){
        var p = placed[j];
        var ho = it.x < p.x + p.w && p.x < it.x + it.w;
        if (!ho) continue;
        var vo = y < p.y + p.h && p.y < y + it.h;
        if (vo){ y = p.y + p.h + gap; changed = true; }
      }
    }
    it.y = y;
    placed.push(it);
    it.fo.setAttribute('y', String(y));
    it.fo.setAttribute('height', String(it.h));
  }
  var maxBottom = placed.reduce(function(m, p){ return Math.max(m, p.y + p.h); }, 0);
  var H = Math.max(baseH, maxBottom);
  svg.setAttribute('height', String(H));
  svg.setAttribute('viewBox', '0 0 ' + (baseW || parseFloat(svg.getAttribute('width')) || 0) + ' ' + H);
}
var dts = svg.querySelectorAll('details');
for (var i = 0; i < dts.length; i++) dts[i].addEventListener('toggle', relayout);
relayout();`;

export function attachGwtRelayout(svg: SVGSVGElement): void {
  try {
    new Function('svg', GWT_RELAYOUT_JS)(svg);
  } catch (_err) {
    /* ignore */
  }
}

function renderD3Swimlane(
  diagram: Selection<BaseType, unknown, HTMLElement, any>,
  maxR: number,
  diagramProps: DiagramProps
) {
  return (swimlane: Swimlane) => {
    const g = diagram.append('g').attr('class', 'em-swimlane');

    g.append('rect')
      .attr('x', 0)
      .attr('y', swimlane.y)
      .attr('rx', '3')
      .attr('width', maxR + diagramProps.swimlanePadding)
      .attr('height', swimlane.height)
      // .attr('stroke', box.visual.stroke)
      .attr('fill', 'rgb(250,250,250)')
      .attr('stroke', 'rgb(240,240,240)');

    g.append('text')
      .attr('font-weight', diagramProps.swimlaneTextFontWeight)
      .attr('x', 30)
      .attr('y', swimlane.y + 30)
      .text(swimlane.label);
  };
}


export const draw_diagram = function (diagramProps: DiagramProps, state: Context, diagram: D3Diagram): D3Diagram {

  // console.debug(`[renderer] draw swimlanes`);
  state.sortedSwimlanesArray.forEach(renderD3Swimlane(diagram, state.maxR, diagramProps));
  // console.debug(`[renderer] draw boxes`);
  state.boxes.forEach(renderD3Box(diagram, diagramProps));
  // console.debug(`[renderer] draw relations`);
  state.relations.forEach(renderD3Relation(diagram, diagramProps));
  // console.debug(`[renderer] draw gwt columns`);
  state.gwtColumns.forEach(renderD3GwtColumn(diagram, diagramProps));

  if (state.gwtColumns.length > 0) {
    const lastSw = state.sortedSwimlanesArray[state.sortedSwimlanesArray.length - 1];
    const bandTopY = lastSw ? lastSw.y + lastSw.height + diagramProps.gwtBandGap : diagramProps.gwtBandGap;
    diagram
      .attr('data-gwt-band-top-y', bandTopY)
      .attr('data-gwt-scenario-gap', diagramProps.gwtScenarioGap);
  }

  const marker = diagram
    .append('defs')
    .append('marker')
    .attr('id', 'arrowhead')
    .attr('markerWidth', '10')
    .attr('markerHeight', '7')
    .attr('refX', '10')
    .attr('refY', '3.5')
    .attr('orient', 'auto');

  marker.append('polygon').attr('points', '0 0, 10 3.5, 0 7').attr('fill', '#000');

  return diagram;
};
