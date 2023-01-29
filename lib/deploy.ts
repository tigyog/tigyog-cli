import * as mime from 'mime-types';

import {
  apiPostVersion,
  apiPutDocPublishedVersionNumber,
} from './apiClient.js';
import { deployCasFile } from './deployCasFile.js';
import { fromMarkdownFile } from './markdownToDb.js';
import { tree } from './tree.js';

const deployMarkdownFile = async (filePath: string) => {
  console.log('  Posting doc', filePath);

  const reqBody = await fromMarkdownFile(filePath);
  const resp = await apiPostVersion(reqBody);
  if (!resp.ok) {
    console.error('    Could not post new version', resp.errors);
    return;
  }
  const newVersionNumber = resp.versionNumber;
  console.log('    Posted new version', newVersionNumber);
  const resp2 = await apiPutDocPublishedVersionNumber(
    reqBody.docId,
    newVersionNumber,
  );
  if (resp2) {
    console.log('    Published new version');
  } else {
    console.error('    Saved draft but could not publish new version');
  }
};

export async function deployCommand(courseDir: string) {
  const casPaths: { filepath: string; mimeType: string }[] = [];
  const markdownPaths: string[] = [];

  for await (const filepath of tree(courseDir)) {
    const mimeType = mime.lookup(filepath);
    if (!mimeType) continue;

    if (mimeType === 'text/markdown') {
      markdownPaths.push(filepath);
    } else if (mimeType.startsWith('image/')) {
      casPaths.push({ filepath, mimeType });
    } else {
      console.log('Ignoring file', filepath);
    }
  }

  // Deploy all images first because we need their keys when deploying Markdown
  for (const { filepath, mimeType } of casPaths)
    await deployCasFile(filepath, mimeType);

  for (const markdownPath of markdownPaths)
    await deployMarkdownFile(markdownPath);

  console.log('Deployment complete');
}
