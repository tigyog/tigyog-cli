import * as fs from 'fs/promises';
import { File, FormData } from 'node-fetch'; // TODO upgrade node, use native FormData and File

import { apiPostFile } from './apiClient.js';

export const filepathToKey: Record<string, string> = {};

export const postCasFile = async (filePath: string, mimeType: string) => {
  console.log('  Posting file', filePath);
  const formData = new FormData();
  const buf = await fs.readFile(filePath);
  const file = new File([buf], filePath, { type: mimeType });
  formData.append('file', file, filePath);
  const { key } = await apiPostFile(formData);
  filepathToKey[filePath] = key;
  console.log('    Posted file, got key', key);
};
