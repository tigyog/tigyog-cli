import * as fs from 'fs/promises';
import { TextDirective } from 'mdast-util-directive';
import * as mime from 'mime-types';

import { addPromptIds } from './extractDirectiveMetadata.js';
import { makeOptionId, makePromptId } from './identifiers.js';
import { parseMarkdown } from './parseMarkdown.js';
import { stringifyMarkdownRoot } from './stringifyMarkdown.js';
import { tree } from './tree.js';
import { visitLists } from './visitors.js';

const fmtMarkdownFile = async (filepath: string) => {
  const inStr = await fs.readFile(filepath, {
    encoding: 'utf8',
  });
  const root = parseMarkdown(inStr);
  addPromptIds(root);

  // TODO transform root here
  visitLists(root, (list, i, parent) => {
    let promptDirective: TextDirective | null = null;

    if (parent && i !== null) {
      const prev = parent.children[i - 1];
      if (prev && prev.type === 'paragraph') {
        for (const c of prev.children) {
          if (c.type === 'textDirective' && c.name === 'buttons') {
            promptDirective = c;
          }
        }
      }
    }

    if (promptDirective) {
      if (!promptDirective.attributes) promptDirective.attributes = {};
      if (!promptDirective.attributes['id'])
        promptDirective.attributes['id'] = makePromptId();

      for (const li of list.children) {
        const p = li.children[0];
        if (p && p.type === 'paragraph') {
          let optionDirective: TextDirective | null = null;
          for (const c of p.children) {
            if (c.type === 'textDirective' && c.name === 'b') {
              optionDirective = c;
            }
          }

          if (optionDirective) {
            if (!optionDirective.attributes) optionDirective.attributes = {};
            if (!optionDirective.attributes['id'])
              optionDirective.attributes['id'] = makeOptionId();
          } else {
            p.children.push(
              { type: 'text', value: ' ' },
              {
                type: 'textDirective',
                name: 'b',
                attributes: { id: makeOptionId() },
                children: [],
              },
            );
          }
        }
      }
    }
  });

  const outStr = stringifyMarkdownRoot(root);
  await fs.writeFile(filepath, outStr, 'utf8');
  console.log('Formatted file', filepath);
};

export async function fmtCommand(courseDir: string) {
  for await (const filepath of tree(courseDir)) {
    const mimeType = mime.lookup(filepath);
    if (!mimeType) continue;
    if (mimeType === 'text/markdown') {
      await fmtMarkdownFile(filepath);
    }
  }
}
