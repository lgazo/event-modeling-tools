import { select } from 'd3';
import { createEventModelingServices, type EventModel } from 'event-modeling-language';
import { create_db, ContentElementStyles } from './db.js';
import { draw_diagram, attachGwtRelayout, type D3Diagram } from './renderer.js';
import type { DiagramProps, Context } from './types.js';
import type { LoggerDep } from './types_services.js';
import { measureContentElements } from './text_measure.js';
import { EmptyFileSystem, URI } from 'langium';

export const SVG_STYLE_BLOCK = `:where(.evml-svg){font-family:${ContentElementStyles.span.fontFamily};font-size:${ContentElementStyles.span.fontSize}px;fill:#333;}:where(.evml-svg) .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}:where(.evml-svg) .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}:where(.evml-svg) .error-icon{fill:#552222;}:where(.evml-svg) .error-text{fill:#552222;stroke:#552222;}:where(.evml-svg) .edge-thickness-normal{stroke-width:1px;}:where(.evml-svg) .edge-thickness-thick{stroke-width:3.5px;}:where(.evml-svg) .edge-pattern-solid{stroke-dasharray:0;}:where(.evml-svg) .edge-thickness-invisible{stroke-width:0;fill:none;}:where(.evml-svg) .edge-pattern-dashed{stroke-dasharray:3;}:where(.evml-svg) .edge-pattern-dotted{stroke-dasharray:2;}:where(.evml-svg) .marker{fill:#333333;stroke:#333333;}:where(.evml-svg) .marker.cross{stroke:#333333;}:where(.evml-svg) svg{font-family:${ContentElementStyles.span.fontFamily};font-size:${ContentElementStyles.span.fontSize}px;}:where(.evml-svg) p{margin:0;}:where(.evml-svg){--mermaid-font-family:${ContentElementStyles.span.fontFamily};}:where(.evml-svg) .em-gwt-column-root{width:100%;box-sizing:border-box;}:where(.evml-svg) .em-gwt-column{display:flex;flex-direction:column;gap:10px;width:100%;font-family:${ContentElementStyles.span.fontFamily};font-size:${ContentElementStyles.span.fontSize}px;}:where(.evml-svg) .em-gwt-scenario{width:100%;}:where(.evml-svg) .em-gwt-details{box-sizing:border-box;border:1px solid #bbb;border-radius:4px;background:#fafafa;padding:6px 8px;overflow:hidden;}:where(.evml-svg) .em-gwt-summary{cursor:pointer;font-weight:700;padding:2px 0;list-style:revert;}:where(.evml-svg) .em-gwt-frame-ref{display:inline-block;background:#333;color:#fff;border-radius:3px;padding:0 6px;margin-right:6px;font-size:11px;}:where(.evml-svg) .em-gwt-body{margin-top:4px;}:where(.evml-svg) .em-gwt-section{margin-top:4px;}:where(.evml-svg) .em-gwt-section-label{font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#555;margin:2px 0;}:where(.evml-svg) .em-gwt-statement{border-radius:3px;padding:4px 6px;margin:3px 0;}:where(.evml-svg) .em-gwt-statement pre{margin:2px 0 0 0;white-space:pre-wrap;font-size:11px;}`;

export interface DomRendererDeps extends LoggerDep {
  document: Document;
}

export interface DomRenderer {
  render(model: EventModel, container: HTMLElement): SVGSVGElement;
}

export function create_dom_renderer(deps: DomRendererDeps): DomRenderer {
  const measurementCtx = createMeasurementContext(deps.document);
  const db = create_db({
    ...deps,
    calculateBoxDimensions: (html, props) => measureContentElements(html, measurementCtx, props.maxWidth)
  });

  const ensureStyle = createStyleInjector(deps.document);

  return {
    render(model: EventModel, container: HTMLElement): SVGSVGElement {
      container.replaceChildren();

      db.setAst(model);
      const state = db.getState();
      const diagramProps = db.getDiagramProps();

      const svg = deps.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('evml-svg');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Event Modeling diagram');
      container.appendChild(svg);

      ensureStyle(svg);

      const diagram = select(svg) as unknown as D3Diagram;
      draw_diagram(diagramProps, state, diagram);

      const { width, height } = computeDiagramSize(diagramProps, state);
      svg.setAttribute('width', `${width}`);
      svg.setAttribute('height', `${height}`);
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      if (state.gwtColumns.length > 0) {
        svg.setAttribute('data-gwt-base-width', `${width}`);
        svg.setAttribute('data-gwt-base-height', `${height}`);
        queueMicrotask(() => attachGwtRelayout(svg));
      }

      return svg;
    }
  };
}

function createMeasurementContext(document: Document): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to access 2D canvas context for measurement.');
  }
  return ctx;
}

function createStyleInjector(document: Document) {
  return (svg: SVGSVGElement) => {
    if (svg.querySelector('style[data-evml-style]')) {
      return;
    }
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-evml-style', 'true');
    style.textContent = SVG_STYLE_BLOCK;
    svg.insertBefore(style, svg.firstChild);
  };
}

function computeDiagramSize(diagramProps: DiagramProps, state: Context): { width: number; height: number } {
  const minWidth = diagramProps.contentStartX + diagramProps.boxMinWidth + 3 * diagramProps.boxPadding;
  const width = Math.max(state.maxR, minWidth);
  const swimlanes = state.sortedSwimlanesArray;
  const swimlanesHeight = swimlanes.length > 0
    ? swimlanes[swimlanes.length - 1].y + swimlanes[swimlanes.length - 1].height
    : diagramProps.swimlaneMinHeight + 2 * diagramProps.swimlanePadding;
  const height = Math.max(swimlanesHeight, state.maxY);

  return { width, height };
}

let nextDocumentId = 0;
export async function parseEvml(source: string): Promise<EventModel> {
  const services = createEventModelingServices(EmptyFileSystem);
  const uri = URI.parse(`memory://evml/${nextDocumentId++}.evml`);
  const documents = services.shared.workspace.LangiumDocuments;
  const documentBuilder = services.shared.workspace.DocumentBuilder;
  const document = services.shared.workspace.LangiumDocumentFactory.fromString(source, uri);
  documents.addDocument(document);

  try {
    await documentBuilder.build([document], { validation: true });

    const diagnostics = document.diagnostics ?? [];
    const errors = diagnostics.filter((diag: { severity?: number }) => diag.severity === 1);
    if (errors.length > 0) {
      const message = errors.map((error: { message: string }) => error.message).join('\n');
      throw new Error(message);
    }

    const model = document.parseResult?.value as EventModel | undefined;
    if (!model) {
      throw new Error('Invalid EVML document: empty parse result.');
    }

    return model;
  } finally {
    documents.deleteDocument(uri);
  }
}


export function serializeSvg(svg: SVGSVGElement): string {
  const serializer = new XMLSerializer();
  const markup = serializer.serializeToString(svg);
  if (markup.startsWith('<?xml')) {
    return markup;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`;
}