import * as fs from 'fs/promises';
import { Blockquote, FootnoteDefinition, List, ListItem, Root } from 'mdast';
import { ContainerDirective, TextDirective } from 'mdast-util-directive';
import * as mime from 'mime-types';

import { addPromptIds } from './extractDirectiveMetadata.js';
import {
  makeChapterId,
  makeCourseId,
  makeOptionId,
  makePromptId,
} from './identifiers.js';
import { getYAML, parseMarkdown, setYAML } from './parseMarkdown.js';
import { stringifyMarkdownRoot } from './stringifyMarkdown.js';
import { tree } from './tree.js';
import { visitLists } from './visitors.js';

const getPromptDirective = (
  i: number | null,
  parent:
    | ListItem
    | Blockquote
    | ContainerDirective
    | FootnoteDefinition
    | Root
    | null,
): TextDirective | null => {
  if (parent === null) return null;
  if (i === null) return null;
  const prev = parent.children[i - 1];
  if (!prev) return null;
  if (prev.type !== 'paragraph') return null;
  for (const c of prev.children) {
    if (c.type === 'textDirective' && c.name === 'buttons') {
      return c;
    }
  }
  return null;
};

const hasBs = (list: List): boolean => {
  for (const li of list.children) {
    const p = li.children[0];
    if (p && p.type === 'paragraph') {
      for (const c of p.children) {
        if (c.type === 'textDirective' && c.name === 'b') {
          return true;
        }
      }
    }
  }
  return false;
};

const ensureLiHasB = (li: ListItem): void => {
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
};

const fmtMarkdownFile = async (filepath: string) => {
  const inStr = await fs.readFile(filepath, {
    encoding: 'utf8',
  });
  const root = parseMarkdown(inStr);
  addPromptIds(root);

  const yaml = getYAML(root);
  const docId = yaml['id'];
  if (docId === undefined) {
    yaml['id'] = yaml['type'] === 'course' ? makeCourseId() : makeChapterId();
    setYAML(root, yaml);
  }

  visitLists(root, (list, i, parent) => {
    const promptDirective = getPromptDirective(i, parent);
    if (promptDirective || hasBs(list)) {
      for (const li of list.children) {
        ensureLiHasB(li);
      }

      if (promptDirective) {
        if (!promptDirective.attributes) promptDirective.attributes = {};
        if (!promptDirective.attributes['id'])
          promptDirective.attributes['id'] = makePromptId();
      } else {
        if (parent !== null && i !== null && list.children.length > 1) {
          parent.children.splice(i, 0, {
            type: 'paragraph',
            children: [
              {
                type: 'textDirective',
                name: 'buttons',
                attributes: { id: makePromptId() },
                children: [],
              },
            ],
          });
          return i + 2;
        }
      }
    }
    return undefined;
  });

  const outStr = stringifyMarkdownRoot(root);
  await fs.writeFile(filepath, outStr, 'utf8');
  console.log('Formatted file', filepath);
};

export async function fmtCommand(courseDir: string) {
  for await (const filepath of tree(courseDir)) {
    const mimeType = mime.lookup(filepath);
    if (!mimeType) continue;
    if (mimeType === 'text/markdown' && filepath.endsWith('.tigyog.md')) {
      await fmtMarkdownFile(filepath);
    }
  }
}
