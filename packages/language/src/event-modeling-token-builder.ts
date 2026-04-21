import { DefaultTokenBuilder } from 'langium';

type Matcher = (text: string, offset: number) => RegExpExecArray | null;

export class EventModelingTokenBuilder extends DefaultTokenBuilder {
    protected override buildTerminalToken(terminal: any): any {
        if (terminal?.name === 'EM_DATA_BLOCK') {
            return { name: terminal.name, PATTERN: matchBlockDataPayload, LINE_BREAKS: true };
        }
        if (terminal?.name === 'EM_DATA_INLINE') {
            return { name: terminal.name, PATTERN: matchInlineDataPayload, LINE_BREAKS: true };
        }
        return super.buildTerminalToken(terminal);
    }
}

interface WalkResult {
    end: number;
    sawNewline: boolean;
}

function walkBalanced(text: string, start: number): WalkResult | null {
    if (text[start] !== '{') return null;
    let depth = 0;
    let sawNewline = false;
    let i = start;
    while (i < text.length) {
        const c = text[i];
        if (c === '"' || c === '\'') {
            const quote = c;
            i++;
            while (i < text.length && text[i] !== quote) {
                if (text[i] === '\\' && i + 1 < text.length) {
                    if (text[i + 1] === '\n') sawNewline = true;
                    i += 2;
                    continue;
                }
                if (text[i] === '\n') sawNewline = true;
                i++;
            }
            if (i >= text.length) return null;
            i++;
            continue;
        }
        if (c === '\n') sawNewline = true;
        if (c === '{') depth++;
        else if (c === '}') {
            depth--;
            if (depth === 0) return { end: i + 1, sawNewline };
        }
        i++;
    }
    return null;
}

function makeMatch(text: string, offset: number, end: number): RegExpExecArray {
    const matched = text.slice(offset, end);
    const result = [matched] as unknown as RegExpExecArray;
    result.index = offset;
    result.input = text;
    return result;
}

const matchInlineDataPayload: Matcher = (text, offset) => {
    if (text[offset] !== '{') return null;
    const r = walkBalanced(text, offset);
    if (!r || r.sawNewline) return null;
    return makeMatch(text, offset, r.end);
};

const matchBlockDataPayload: Matcher = (text, offset) => {
    if (text[offset] !== '{') return null;
    let j = offset + 1;
    while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
    const startsWithNewline = text[j] === '\n' || (text[j] === '\r' && text[j + 1] === '\n');
    if (!startsWithNewline) return null;
    const r = walkBalanced(text, offset);
    if (!r) return null;
    let k = r.end - 2;
    while (k >= offset && (text[k] === ' ' || text[k] === '\t')) k--;
    if (k < offset || text[k] !== '\n') return null;
    let end = r.end;
    if (text[end] === '\r') end++;
    if (text[end] === '\n') end++;
    return makeMatch(text, offset, end);
};
