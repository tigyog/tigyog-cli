import * as fs from 'fs/promises';
import * as path from 'path';

// TODO make this ignore list configurable, e.g. just use .gitignore
const ignore = ['.git', 'venv'];

export async function* tree(root: string): AsyncGenerator<string> {
  if (ignore.includes(path.basename(root))) return;

  const stats = await fs.stat(root);
  if (stats.isDirectory()) {
    for (const c of await fs.readdir(root)) {
      yield* tree(path.join(root, c));
    }
  } else {
    yield root;
  }
}
