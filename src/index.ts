import * as fs from 'fs';
import * as path from 'path';
import * as npmPackage from '../package.json';
import * as commandLineArgs from 'command-line-args';
import { OptionDefinition } from 'command-line-args';
import * as getUsage from 'command-line-usage';
import { avroToTypeScript, RecordType } from './avro-typescript';
import { getFilesFromInput } from './utils.js';

export interface IOptionDefinition extends OptionDefinition {
  description: string;
}

const optionDefinitions: IOptionDefinition[] = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Show help text',
  },
  {
    name: 'input',
    alias: 'i',
    defaultOption: true,
    type: String,
    multiple: true,
    description: 'Input file or folder (default option, so i can be omitted). If folder, reads all *avsc files.',
  },
  {
    name: 'verbose',
    alias: 'v',
    type: Boolean,
    description: 'Turn verbose output on.',
  },
  {
    name: 'outFolder',
    alias: 'o',
    type: String,
    description: 'Location where you want to save the output files. If not supplied, use the input folder.',
  },
];
const options = commandLineArgs(optionDefinitions) as {
  input: string[];
  verbose?: boolean;
  outFolder?: string;
  help: boolean;
};

const sections = [
  {
    header: `${npmPackage.name}, v0.3.0`,
    content: `${npmPackage.license} license.

  ${npmPackage.description}

  Use avro-typescript-converter to infer a TypeScript interface based on an AVRO schema.
  `,
  },
  {
    header: 'Options',
    optionList: optionDefinitions,
  },
  {
    header: 'Examples',
    content: [
      {
        desc: '01. Convert a schema to an interface',
        example: '$ avro-typescript-converter example/standard_cap-value.avsc',
      },
      {
        desc: '02. Convert a schema to an interface, specifying the output folder',
        example: '$ avro-typescript-converter example/standard_cap-value.avsc -o output',
      },
      {
        desc: '03. Convert a schema to an interface, also displaying the output',
        example: '$ avro-typescript-converter -v example/standard_cap-value.avsc',
      },
      {
        desc: '04. Convert all schemas in a folder to an interface, also displaying the output',
        example: '$ avro-typescript-converter -v example/',
      },
    ],
  },
];

const convert = () => {
  if (!options || !options.input) {
    const usage = getUsage(sections);
    console.log(usage);
    process.exit(0);
  }

  let outFolder: string;
  if (options.outFolder) {
    outFolder = path.resolve(process.cwd(), options.outFolder);
    if (!fs.existsSync(outFolder)) {
      fs.mkdirSync(outFolder);
    }
  }

  options.input.forEach(input => {
    const validInputFiles = getFilesFromInput(input);
    validInputFiles.forEach((input: string) => {
        const schemaText = fs.readFileSync(input, 'UTF8');
        const strippedSchemaText = schemaText.replace(/(?<!:)(\/\*[\s\S]*?\*\/|\/\/.*)/g,''); // strip away comments but not urls (we check if the slash is preceeded by a colon
        const schema = JSON.parse(strippedSchemaText) as RecordType;
        const outFile = `${path.basename(input, path.extname(input))}.ts`;
        const result = avroToTypeScript(schema as RecordType).replace(/\t/g, '  ');
        if (!options.outFolder) {
          outFolder = path.dirname(input);
        }
        fs.writeFileSync(path.join(outFolder, outFile), result, 'UTF8');
        if (options.verbose) {
          console.log(`${result} is written to ${outFile} in ${outFolder}.`);
        }
    });
  });
};

convert();
console.log('done');
