import * as path from 'path';

import {
  apiPostVersion,
  apiPutDocPublishedVersionNumber,
} from './apiClient.js';
import { fromMarkdownFile } from './markdownToDb.js';

const filepathToDocId: Record<string, string> = {};

export const publishMarkdownFile = async (
  filePath: string,
): Promise<string> => {
  const cachedDocId = filepathToDocId[filePath];
  if (cachedDocId) return cachedDocId;

  const reqBody = await fromMarkdownFile(filePath);
  const docId = reqBody.docId;
  const resp = await apiPostVersion(reqBody);
  if (!resp.ok) {
    throw new Error(
      `Could not post ${filePath}, got errors: ` + JSON.stringify(resp.errors),
    );
  }
  const newVersionNumber = resp.versionNumber;
  console.log('Posted', filePath, 'as version', newVersionNumber);
  const resp2 = await apiPutDocPublishedVersionNumber(docId, newVersionNumber);
  if (resp2) {
    console.log('Published new version');
  } else {
    console.error('Could not publish new version!');
  }
  filepathToDocId[filePath] = docId;
  return docId;
};

export async function publishCommand(courseDir: string) {
  await publishMarkdownFile(path.join(courseDir, 'index.md'));
  console.log('Course published');
}
