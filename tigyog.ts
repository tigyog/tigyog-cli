import { Command } from 'commander';

import { setSession } from './lib/config.js';
import { publishCommand } from './lib/publish.js';
import { fmtCommand } from './lib/fmt.js';

const program = new Command();

program.name('tigyog').description('Official CLI for https://tigyog.app');

program
  .command('fmt')
  .description('Prepare files for publishing, e.g. add IDs to buttons')
  .argument('<coursedir>', 'path to directory containing all course content')
  .action((courseDir) => {
    fmtCommand(courseDir);
  });

program
  .command('login')
  .description('Log with your TigYog account, to allow publishing')
  .argument(
    '<sessiontoken>',
    'get this from https://tigyog.app/account',
  )
  .action((sessionToken) => {
    setSession(sessionToken);
  });

program
  .command('publish')
  .description('Publish course from local files')
  .argument('<coursedir>', 'path to directory containing all course content')
  .action((courseDir) => {
    publishCommand(courseDir);
  });

program.parse();
