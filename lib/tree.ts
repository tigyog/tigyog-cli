import * as fs from 'fs/promises';
import * as path from 'path';

export async function* tree(root: string): AsyncGenerator<string> {
  const stats = await fs.stat(root);
  if (stats.isDirectory())
    for (const c of await fs.readdir(root)) yield* tree(path.join(root, c));
  else yield root;
}
