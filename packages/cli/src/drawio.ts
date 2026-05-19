import * as path from 'node:path';
import { extractDestinationAndName } from './util.js';
import { write_drawio } from 'event-modeling-layout-headless';
import { EventModel } from 'event-modeling-language';
import { writeFileSync } from 'node:fs';
import * as fs from 'node:fs';
import { console_log } from './console_log.js';


export function generateDrawio(
    model: EventModel,
    filePath: string,
    destination: string | undefined): string {

    const data = extractDestinationAndName(filePath, destination);
    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, { recursive: true });
    }
    const generatedFilePath = `${path.join(data.destination, data.name)}.drawio`;

    const xml = write_drawio({ log: console_log })(model);
    writeFileSync(generatedFilePath, xml, 'utf-8');

    return generatedFilePath;
}
