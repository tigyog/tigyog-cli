import * as fs from 'fs/promises';
import * as mime from 'mime-types';
import { extension } from 'mime-types';
import { File, FormData } from 'node-fetch'; // TODO upgrade node, use native FormData and File
import { createHash } from 'node:crypto';

import { apiFileExists, apiPostFile } from './apiClient.js';

const computeCasKey = async (
  buffer: Buffer,
  mimeType: string,
): Promise<string> => {
  // Same as on the server-side

  const contentHash = createHash('sha256').update(buffer).digest('hex');
  const fileExtension = extension(mimeType);
  if (!fileExtension) {
    throw new Error(`Unknown MIME type: ${mimeType}`);
  }
  return `${contentHash}.${fileExtension}`;
};

export const postBufferWithMimeType = async ({
  buffer,
  mimeType,
  filePath,
}: {
  buffer: Buffer;
  mimeType: string;
  filePath: string;
}): Promise<string> => {
  const expectedKey = await computeCasKey(buffer, mimeType);
  if (await apiFileExists(expectedKey)) {
    console.log('File already uploaded:', expectedKey);
    return expectedKey;
  }
  console.log('Uploading file:', filePath);

  const formData = new FormData();
  const file = new File([buffer], filePath, { type: mimeType });
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
  const key = await postBufferWithMimeType({
    buffer: await fs.readFile(filePath),
    mimeType,
    filePath,
  });
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
