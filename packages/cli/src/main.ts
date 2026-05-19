import type { EventModel } from 'event-modeling-language';
import { createEventModelingServices, EventModelingLanguageMetaData } from 'event-modeling-language';
import chalk from 'chalk';
import { Command } from 'commander';
import { extractAstNode } from './util.js';
// import { generateJavaScript } from './generator.js';
import { NodeFileSystem } from 'langium/node';
import * as url from 'node:url';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { generateSvg } from './svg.js';
import { generateDrawio } from './drawio.js';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const packagePath = path.resolve(__dirname, '..', 'package.json');
const packageContent = await fs.readFile(packagePath, 'utf-8');

// export const generateAction = async (fileName: string, opts: GenerateOptions): Promise<void> => {
//     const services = createEventModelingServices(NodeFileSystem).EventModeling;
//     const model = await extractAstNode<EventModel>(fileName, services);
//     const generatedFilePath = generateJavaScript(model, fileName, opts.destination);
//     console.log(chalk.green(`JavaScript code generated successfully: ${generatedFilePath}`));
// };

export const svgAction = async (fileName: string, opts: GenerateOptions): Promise<void> => {
    const services = createEventModelingServices(NodeFileSystem).EventModeling;
    const model = await extractAstNode<EventModel>(fileName, services);
    const generatedFilePath = generateSvg(model, fileName, opts.destination);
    console.log(chalk.green(`SVG generated successfully: ${generatedFilePath}`));
};

export const drawioAction = async (fileName: string, opts: GenerateOptions): Promise<void> => {
    const services = createEventModelingServices(NodeFileSystem).EventModeling;
    const model = await extractAstNode<EventModel>(fileName, services);
    const generatedFilePath = generateDrawio(model, fileName, opts.destination);
    console.log(chalk.green(`DrawIO diagram generated successfully: ${generatedFilePath}`));
};

export type GenerateOptions = {
    destination?: string;
}

export default function(): void {
    const program = new Command();

    program.version(JSON.parse(packageContent).version);

    const fileExtensions = EventModelingLanguageMetaData.fileExtensions.join(', ');
    // program
    //     .command('generate')
    //     .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
    //     .option('-d, --destination <dir>', 'destination directory of generating')
    //     .description('generates JavaScript code that prints "Hello, {name}!" for each greeting in a source file')
    //     .action(generateAction);

    program
        .command('svg')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .option('-d, --destination <dir>', 'destination directory of generating')
        .description('generates SVG for a source file')
        .action(svgAction);
    program
        .command('drawio')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .option('-d, --destination <dir>', 'destination directory of generating')
        .description('generates DrawIO (mxGraph XML) diagram for a source file')
        .action(drawioAction);
    program.parse(process.argv);
}
