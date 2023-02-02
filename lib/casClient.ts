import * as fs from 'fs/promises';
import * as mime from 'mime-types';
import { File, FormData } from 'node-fetch'; // TODO upgrade node, use native FormData and File

import { apiPostFile } from './apiClient.js';

export const postCasFileWithMimeType = async (
  filePath: string,
  mimeType: string,
): Promise<string> => {
  const formData = new FormData();
  const buf = await fs.readFile(filePath);
  const file = new File([buf], filePath, { type: mimeType });
  formData.append('file', file, filePath);
  const { key } = await apiPostFile(formData);
  console.log('Posted file', filePath);
  return key;
};

const filepathToKey: Record<string, string> = {};

export const postCasFile = async (filePath: string): Promise<string> => {
  const cachedKey = filepathToKey[filePath];
  if (cachedKey) return cachedKey;

  const mimeType = mime.lookup(filePath);
  if (!mimeType) throw new Error(`Expected mime type for ${filePath}`);
  const key = await postCasFileWithMimeType(filePath, mimeType);
  filepathToKey[filePath] = key;
  return key;
};

export const postCasFiles = async (
  filePaths: string[],
): Promise<{ [filePath: string]: string }> => {
  const x = await Promise.all(
    filePaths.map(async (fp) => {
      const k = await postCasFile(fp);
      return [fp, k] as [string, string];
    }),
  );
  return Object.fromEntries(x);
};
