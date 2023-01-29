import fetch from 'node-fetch';

import { getSession } from './config.js';
import {
  ErrorsResponseBody,
  PostVersionRequestBody,
  PostVersionResponseBody,
  UploadFileResponseBody,
} from './types/api.js';
import { urlToApiDocPublished, urlToApiVersions, urlToFiles } from './urls.js';

const requireSession = (): string => {
  const session = getSession();
  if (session === undefined) throw new Error('Must be logged in');
  return session;
};

export const apiPostVersion = async (
  version: PostVersionRequestBody,
): Promise<
  { ok: true; versionNumber: number } | { ok: false; errors: string[] }
> => {
  const response = await fetch(urlToApiVersions, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `TY_SESSION=${requireSession()}`,
    },
    body: JSON.stringify(version),
  });
  if (response.ok) {
    const body = (await response.json()) as PostVersionResponseBody;
    return { ok: true, versionNumber: body.versionNumber };
  } else {
    const body = (await response.json()) as ErrorsResponseBody;
    return { ok: false, errors: body.errors };
  }
};

export const apiPutDocPublishedVersionNumber = async (
  docId: string,
  newPublishedSVN: number | null,
): Promise<boolean> => {
  const newPageData = JSON.stringify({
    publishedVersionNumber: newPublishedSVN,
  });
  const result = await fetch(urlToApiDocPublished(docId), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      cookie: `TY_SESSION=${requireSession()}`,
    },
    body: newPageData,
  });
  return result.ok;
};

export const apiPostFile = async (
  formData: FormData,
): Promise<UploadFileResponseBody> => {
  const response = await fetch(urlToFiles, {
    method: 'POST',
    body: formData,
  });
  if (response.ok) {
    const body = (await response.json()) as UploadFileResponseBody;
    return body;
  }
  return Promise.reject('Could not upload file: ' + response.status);
};
