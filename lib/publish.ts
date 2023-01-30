import * as mime from 'mime-types';

import {
  apiPostVersion,
  apiPutDocPublishedVersionNumber,
} from './apiClient.js';
import { fromMarkdownFile } from './markdownToDb.js';
import { tree } from './tree.js';

const publishMarkdownFile = async (filePath: string) => {
  const reqBody = await fromMarkdownFile(filePath);
  const resp = await apiPostVersion(reqBody);
  if (!resp.ok) {
    console.error('Could not post', filePath, ', got errors:', resp.errors);
    return;
  }
  const newVersionNumber = resp.versionNumber;
  console.log('Posted', filePath, 'as version', newVersionNumber);
  const resp2 = await apiPutDocPublishedVersionNumber(
    reqBody.docId,
    newVersionNumber,
  );
  if (resp2) {
    console.log('Published new version');
  } else {
    console.error('Could not publish new version!');
  }
};

export async function publishCommand(courseDir: string) {
  for await (const filepath of tree(courseDir)) {
    const mimeType = mime.lookup(filepath);
    if (!mimeType) continue;

    if (mimeType === 'text/markdown') {
      await publishMarkdownFile(filepath);
    }
  }
  console.log('Course published');
}
