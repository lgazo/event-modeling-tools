import { createCanvas } from '@napi-rs/canvas';
import * as d3 from 'd3';
import { JSDOM } from 'jsdom';
import { ContentElement, ContentElementStyles, create_db } from 'event-modeling-layout';
import { EventModel } from 'event-modeling-language';
import { D3Diagram, draw_diagram, GWT_RELAYOUT_JS } from 'event-modeling-layout';
import { LoggerDep } from 'event-modeling-layout';
import { measureContentElements } from 'event-modeling-layout';

export function calculateBoxDimensions(
    html: ContentElement[],
    props: { maxWidth: number }
): { width: number; height: number } {
    const canvas = createCanvas(100, 100); // Size irrelevant for measurement
    const ctx = canvas.getContext('2d')!;
    return measureContentElements(html, ctx as unknown as CanvasRenderingContext2D, props.maxWidth);
}

export const write_svg = (deps: LoggerDep) => (
    model: EventModel,
): string => {

    const db = create_db({
        ...deps,
        calculateBoxDimensions
    });
    db.setAst(model);

    const state = db.getState();
    const diagramProps = db.getDiagramProps();

    const gwtStyle = state.gwtColumns.length > 0
        ? `#dynamic .em-gwt-column-root{width:100%;box-sizing:border-box;}#dynamic .em-gwt-column{display:flex;flex-direction:column;gap:10px;width:100%;font-family:${ContentElementStyles.span.fontFamily};font-size:${ContentElementStyles.span.fontSize}px;}#dynamic .em-gwt-scenario{width:100%;}#dynamic .em-gwt-details{box-sizing:border-box;border:1px solid #bbb;border-radius:4px;background:#fafafa;padding:6px 8px;overflow:hidden;}#dynamic .em-gwt-summary{cursor:pointer;font-weight:700;padding:2px 0;list-style:revert;}#dynamic .em-gwt-frame-ref{display:inline-block;background:#333;color:#fff;border-radius:3px;padding:0 6px;margin-right:6px;font-size:11px;}#dynamic .em-gwt-body{margin-top:4px;}#dynamic .em-gwt-section{margin-top:4px;}#dynamic .em-gwt-section-label{font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#555;margin:2px 0;}#dynamic .em-gwt-statement{border-radius:3px;padding:4px 6px;margin:3px 0;}#dynamic .em-gwt-statement pre{margin:2px 0 0 0;white-space:pre-wrap;font-size:11px;}`
        : '';

    const dom = new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg" id="dynamic">
        <style>#dynamic{font-family:${ContentElementStyles.span.fontFamily};font-size:${ContentElementStyles.span.fontSize}px;fill:#333;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#dynamic .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#dynamic .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#dynamic .error-icon{fill:#552222;}#dynamic .error-text{fill:#552222;stroke:#552222;}#dynamic .edge-thickness-normal{stroke-width:1px;}#dynamic .edge-thickness-thick{stroke-width:3.5px;}#dynamic .edge-pattern-solid{stroke-dasharray:0;}#dynamic .edge-thickness-invisible{stroke-width:0;fill:none;}#dynamic .edge-pattern-dashed{stroke-dasharray:3;}#dynamic .edge-pattern-dotted{stroke-dasharray:2;}#dynamic .marker{fill:#333333;stroke:#333333;}#dynamic .marker.cross{stroke:#333333;}#dynamic svg{font-family:${ContentElementStyles.span.fontFamily};font-size:${ContentElementStyles.span.fontSize}px;}#dynamic p{margin:0;}#dynamic :root{--mermaid-font-family:${ContentElementStyles.span.fontFamily};}${gwtStyle}</style>
        </svg>`, { contentType: 'image/svg+xml' });
    const document = dom.window.document;
    const svgElement = d3.select(document.querySelector('svg') as Element);

    const diagram = svgElement as unknown as D3Diagram;
    draw_diagram(diagramProps, state, diagram);

    const minWidth = diagramProps.contentStartX + diagramProps.boxMinWidth + 3 * diagramProps.boxPadding;
    const width = Math.max(state.maxR, minWidth);
    const swimlanes = state.sortedSwimlanesArray;
    const swimlanesHeight = swimlanes.length > 0
        ? swimlanes[swimlanes.length - 1].y + swimlanes[swimlanes.length - 1].height
        : diagramProps.swimlaneMinHeight + 2 * diagramProps.swimlanePadding;
    const height = Math.max(swimlanesHeight, state.maxY);

    diagram
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

    if (state.gwtColumns.length > 0) {
        diagram
            .attr('data-gwt-base-width', width)
            .attr('data-gwt-base-height', height);
        const svgNode = document.querySelector('svg') as Element;
        const scriptEl = document.createElementNS('http://www.w3.org/2000/svg', 'script');
        scriptEl.setAttribute('type', 'application/ecmascript');
        const js = `(function(){var s=document.currentScript;var svg=(s&&typeof s.closest==='function'?s.closest('svg'):null)||document.documentElement;if(!svg)return;${GWT_RELAYOUT_JS}})();`;
        scriptEl.appendChild(document.createCDATASection(js));
        svgNode.appendChild(scriptEl);
    }

    const svg_string = dom.serialize();
    return svg_string;
}
