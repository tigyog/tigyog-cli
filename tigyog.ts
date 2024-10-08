import { Command } from 'commander';
import { createRequire } from 'module';
import { exit } from 'process';

import { apiWhoAmI } from './lib/apiClient.js';
import { deleteSession, getSession, setSession } from './lib/config.js';
import { fmtCommand } from './lib/fmt.js';
import { initCommand } from './lib/initCommand.js';
import { publishCommand } from './lib/publish.js';

const packageJson = createRequire(import.meta.url)('../package.json');

const showWhoAmI = async () => {
  await apiWhoAmI()
    .then((accountInfo) => {
      console.log(
        'Logged in as',
        accountInfo.accountId,
        accountInfo.ownerEmail
          ? `(email: ${accountInfo.ownerEmail})`
          : '(Account has no email set)',
      );
    })
    .catch((r) => {
      console.log('Session token seems invalid:', r);
      exit(1);
    });
};

const program = new Command();

program
  .name('tigyog')
  .description('Official CLI for https://tigyog.app')
  .version(packageJson.version);

program
  .command('init')
  .description('Create a blank new course')
  .action(async () => {
    await initCommand();
  });

program
  .command('fmt')
  .description('Prepare files for publishing, e.g. add IDs to buttons')
  .argument(
    '[path]',
    'path to course directory or file (default: current directory)',
  )
  .action(async (path) => {
    await fmtCommand(path ?? '.');
  });

program
  .command('login')
  .description('Log with your TigYog account, to allow publishing')
  .argument('[sessiontoken]', 'get this from https://tigyog.app/account')
  .action(async (sessionToken) => {
    if (sessionToken === undefined) {
      console.error(
        'Missing argument, run `tigyog login [sessiontoken]`, with your session token from https://tigyog.app/account',
      );
      exit(1);
    }
    if (typeof sessionToken !== 'string') {
      throw new Error(
        `Session token must be a string, but I received ${typeof sessionToken}`,
      );
    }
    if (sessionToken === '') {
      console.error(
        'Session token must not be the empty string! Run `tigyog login [sessiontoken]` with your session token from https://tigyog.app/account',
      );
      exit(1);
    }
    setSession(sessionToken);
    await showWhoAmI();
  });

program
  .command('logout')
  .description('Remove session for your TigYog account')
  .action(async () => {
    deleteSession();
  });

program
  .command('whoami')
  .description('Check which TigYog account you are logged in with')
  .action(async () => {
    const session = getSession();
    if (session === undefined) {
      console.log('Not logged in.');
      return;
    }
    await showWhoAmI();
  });

program
  .command('publish')
  .description('Publish course from local files')
  .argument(
    '[coursedir]',
    'path to course directory (default: current directory)',
  )
  .option('-c, --courseid <string>', 'the course ID to publish to')
  .option('--dryrun', 'run the publish command without actually publishing')
  .action(async (courseDir, options) => {
    const courseId = options['courseid'];
    const dryRun = !!options['dryrun'];
    await publishCommand({ courseDir: courseDir ?? '.', courseId, dryRun });
  });

program.parse();
