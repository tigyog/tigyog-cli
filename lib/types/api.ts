import { DbBlockRoot } from './db.js';

export type ErrorsResponseBody = { errors: string[] };

export type UploadFileResponseBody = {
  key: string;
};

export type PostVersionRequestBody = {
  docId: string;

  // 0 means "Create new document"
  // n means "Update document, but fail if previous version was not n-1"
  // undefined means "Force update document; I don't know previous version number"
  versionNumber?: number;

  draftContent: DbBlockRoot;
};

export type PostVersionResponseBody = {
  versionNumber: number;
};
