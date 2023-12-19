import fs from 'fs';
import path from 'path';
import readline from 'readline';


// For state management
export enum StateType {
  Init = 'init',
  HasDependentVariable = 'dependent variable',
  HasIndependentVariable = 'independent variable',
  HasBothVariables = 'has both dependent variable and independent variable'
}

// Define the allowable keys for the variables object
export type VariableKey = 'independent_variable' | 'dependent_variable';

// Define the structure for the variables object
export interface Variables {
  independent_variable?: string;
  dependent_variable?: string;
}

// Define the structure for the state data
export interface StateData {
  [conversationId: string]: {
    state: string;
    variables: Variables
  };
}

// Type guard to check if a key is a valid VariableKey
export function isValidVariableKey(key: any): key is VariableKey {
  return ['independent_variable', 'dependent_variable'].includes(key);
}

// For file analysis
// Directory containing CSV files
const directoryPath = path.resolve(process.env.STORAGE as string);

// Function to guess the delimiter in a CSV line
function guessDelimiter(line: string): string {
  const delimiters = [',', ';', '\t', '|'];
  let maxCount = 0;
  let guessedDelimiter = ',';

  delimiters.forEach(delimiter => {
    const count = (line.split(delimiter).length - 1);
    if (count > maxCount) {
      maxCount = count;
      guessedDelimiter = delimiter;
    }
  });

  return guessedDelimiter;
}

async function readHeader(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      const delimiter = guessDelimiter(line);
      const headers = line.split(delimiter);
      resolve(headers);

      rl.close();
      fileStream.destroy();
    });

    rl.on('error', (err) => {
      reject('Error reading file: ' + err);
    });
  });
}

// Function to check if the line is likely a header
async function isHeaderLine(line: string): Promise<boolean> {
  // A simple heuristic: if most of the items are not numbers, it's likely a header
  const items = line.split(/[\s,;]+/);
  const nonNumericItemCount = items.filter(item => isNaN(Number(item))).length;
  return nonNumericItemCount > items.length / 2;
}

export async function readCSV(): Promise<{ [key: string]: string[] }> {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, async (err, files) => {
      if (err) {
        reject('Error reading directory: ' + err);
        return;
      }

      let headers: { [key: string]: string[] } = {};

      for (const file of files) {
        if (path.extname(file).toLowerCase() === '.csv') {
          const filePath = path.join(directoryPath, file);
          const header = await readHeader(filePath);
          const isHeaderValid = await isHeaderLine(header[0]);
          if (isHeaderValid) {
            headers[file] = header;
          }
        }
      }

      resolve(headers);
    });
  });
}
