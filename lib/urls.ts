import { TY_ORIGIN } from './config.js';

const toGlobalUrl = (relUrl: string) => TY_ORIGIN + relUrl;

export const urlToApiVersions = toGlobalUrl(`/api/versions`);
export const urlToApiDocPublished = (docId: string) =>
  toGlobalUrl(`/api/docs/${docId}/published`);
export const urlToFiles = toGlobalUrl('/api/files');
export const urlToCasFile = (casKey: string) =>
  toGlobalUrl(`/api/files/${casKey}`);
export const urlToApiAccountWhoAmI = toGlobalUrl('/api/account/whoami');
