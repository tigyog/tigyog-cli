import { Command } from 'commander';

import { setSession } from './lib/config.js';
import { deployCommand } from './lib/deploy.js';
import { fmtCommand } from './lib/fmt.js';

const program = new Command();

program.name('tigyog').description('Official CLI for https://tigyog.app');

program
  .command('fmt')
  .description('Prepare files for deployment, e.g. add IDs to buttons')
  .argument('<coursedir>', 'path to directory containing all course content')
  .action((courseDir) => {
    fmtCommand(courseDir);
  });

program
  .command('login')
  .description('Log with your TigYog account, to allow deployment')
  .argument(
    '<sessiontoken>',
    'get this from the TY_SESSION cookie in your browser',
  )
  .action((sessionToken) => {
    setSession(sessionToken);
  });

program
  .command('deploy')
  .description('Publish course from local files')
  .argument('<coursedir>', 'path to directory containing all course content')
  .action((courseDir) => {
    deployCommand(courseDir);
  });

program.parse();
