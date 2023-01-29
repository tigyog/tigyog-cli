import Conf from 'conf';

const config = new Conf({ projectName: 'tigyog' });

const KEY_SESSION = 'session';

export const getSession = () => config.get(KEY_SESSION) as string | undefined;
export const setSession = (session: string) => config.set(KEY_SESSION, session);

// For development purposes
export const TY_ORIGIN =
  (config.get('origin') as string | undefined) ?? 'https://tigyog.app';
