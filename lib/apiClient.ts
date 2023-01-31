import fetch from 'node-fetch';
import { FormData } from 'node-fetch';

import { getSession } from './config.js';
import {
  ErrorsResponseBody,
  PostVersionRequestBody,
  PostVersionResponseBody,
  UploadFileResponseBody,
  WhoAmIResponseBody,
} from './types/api.js';
import {
  urlToApiAccountWhoAmI,
  urlToApiDocPublished,
  urlToApiVersions,
  urlToFiles,
} from './urls.js';

const requireSession = (): string => {
  const session = getSession();
  if (session === undefined)
    throw new Error('Must be logged in. Please use `tigyog login` first.');
  if (session === '')
    throw new Error(
      'Your session token is the empty string. This is invalid. Please use `tigyog login`.',
    );
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

export const apiWhoAmI = async (): Promise<WhoAmIResponseBody> => {
  const resp = await fetch(urlToApiAccountWhoAmI, {
    headers: {
      cookie: `TY_SESSION=${requireSession()}`,
    },
  });
  if (resp.ok) {
    const data = (await resp.json()) as WhoAmIResponseBody;
    return data;
  } else {
    return Promise.reject(await resp.json());
  }
};

export const apiPostFile = async (
  formData: typeof FormData,
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
