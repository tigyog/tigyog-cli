import * as fs from 'fs/promises';
import { Content, List, ListItem, Paragraph } from 'mdast';
import * as path from 'path';
import { basename } from 'path';

import { filepathToKey } from './deployCasFile.js';
import {
  addPromptIds,
  getOptionData,
  getPromptId,
} from './extractDirectiveMetadata.js';
import { getYAML, parseMarkdown } from './parseMarkdown.js';
import { PostVersionRequestBody } from './types/api.js';
import {
  DbBlockCourseChild,
  DbBlockImage,
  DbBlockLessonChild,
  DbBlockLinkChild,
  DbBlockPara,
  DbBlockResponse,
  DbInline,
  DbInlineOption,
  DbNode,
  DbNonRootBlock,
} from './types/db.js';

type Ctx = { filepath: string };

const bolden = <T extends DbNode>(n: T): T => {
  if ('type' in n) {
    return { ...n, children: n.children.map(bolden) };
  } else {
    return { ...n, bold: true };
  }
};

const italicize = <T extends DbNode>(n: T): T => {
  if ('type' in n) {
    return { ...n, children: n.children.map(italicize) };
  } else {
    return { ...n, italic: true };
  }
};

const listItemToOption = (
  ctx: Ctx,
  promptId: string,
  listItem: ListItem,
): [DbInlineOption, DbBlockResponse[]] => {
  const firstBlock = listItem.children[0];

  if (firstBlock === undefined) {
    throw new Error('Unexpected list item with no children');
  }

  if (firstBlock.type !== 'paragraph') {
    throw new Error(
      `Expected list item first child to be paragraph but was ${firstBlock.type}`,
    );
  }

  const optionData = getOptionData(firstBlock);

  if (!optionData) {
    throw new Error(`Expected button data in list item`);
  }

  const rest = listItem.children.slice(1);

  return [
    {
      type: 'option',
      id: optionData.id,
      children: fromNodes(ctx, firstBlock.children) as DbInline[],
      ...(optionData.correct === null ? {} : { correct: optionData.correct }),
    },
    rest.length > 0
      ? [
          {
            type: 'response',
            toPromptId: promptId,
            optionIds: [optionData.id],
            children: fromNodes(ctx, rest) as DbNonRootBlock[],
          },
        ]
      : [],
  ];
};

const fromList = (ctx: Ctx, node: List): DbNonRootBlock[] => {
  const promptId = getPromptId(node);
  if (promptId) {
    const out = node.children.map((li) => listItemToOption(ctx, promptId, li));
    return [
      { type: 'prompt', id: promptId, children: out.map((o) => o[0]) },
      ...out.flatMap((o) => o[1]),
    ];
  } else {
    return fromNodes(ctx, node.children) as DbNonRootBlock[];
  }
};

const fromParagraph = (
  ctx: Ctx,
  node: Paragraph,
): (DbBlockPara | DbBlockImage)[] => {
  const firstChild = node.children[0];
  if (firstChild && firstChild.type === 'image') {
    const imgPath = path.join(path.dirname(ctx.filepath), firstChild.url);
    const key = filepathToKey[imgPath];
    if (!key) {
      throw new Error(
        'Unknown file: ' +
          imgPath +
          '; I know about ' +
          JSON.stringify(filepathToKey),
      );
    }

    // Markdown images (like HTML) are considered inline,
    // but TigYog images are blocks.
    return [
      {
        type: 'image',
        key: key,
        children: [{ text: firstChild.alt ?? '' }],
      },
    ];
  } else {
    return [
      { type: 'p', children: fromNodes(ctx, node.children) as DbInline[] },
    ];
  }
};

const fromNode = (ctx: Ctx, node: Content): DbNode[] => {
  switch (node.type) {
    // Block elements
    case 'code':
      return [
        {
          type: 'blockcode',
          children: [{ text: node.value }],
          ...(node.lang ? { language: node.lang } : {}),
        },
      ];
    case 'heading':
      if (node.depth <= 1) {
        return [
          { type: 'h1', children: fromNodes(ctx, node.children) as DbInline[] },
        ];
      } else {
        return [
          { type: 'h2', children: fromNodes(ctx, node.children) as DbInline[] },
        ];
      }
    case 'image':
      // We support single image within paragraph, but not inline images - skip them
      return [];
    case 'list':
      return fromList(ctx, node);
    case 'listItem':
      return node.children.flatMap((bl) =>
        bl.type === 'paragraph'
          ? [
              {
                type: 'p',
                listStyleType: 'disc',
                children: fromNodes(ctx, bl.children) as DbInline[],
              },
            ]
          : (fromNode(ctx, bl) as DbNode[]),
      );
    case 'math':
      return [{ type: 'blockmath', children: [{ text: node.value }] }];
    case 'paragraph':
      return fromParagraph(ctx, node);

    // Inline elements
    case 'break':
      return [{ type: 'br', children: [{ text: '' }] }];
    case 'emphasis':
      return fromNodes(ctx, node.children).map(italicize);
    case 'inlineCode':
      return [{ type: 'inlinecode', children: [{ text: node.value }] }];
    case 'inlineMath':
      return [{ type: 'inlinemath', children: [{ text: node.value }] }];
    case 'link':
      return [
        {
          type: 'link',
          href: node.url,
          children: fromNodes(ctx, node.children) as DbInline[],
        },
      ];
    case 'strong':
      return fromNodes(ctx, node.children).map(bolden);
    case 'text':
      return [{ text: node.value.replaceAll(/[\r\n]/g, ' ') }];

    case 'containerDirective':
      if (node.name === 'chapterlink') {
        return [
          {
            type: 'lessonlink',
            children: fromNodes(ctx, node.children) as DbBlockLinkChild[],
            ...(node.attributes && node.attributes['id']
              ? { lessonId: node.attributes['id'] }
              : {}),
          },
        ];
      } else {
        return [];
      }

    // Unsupported, but we can extract child content:
    case 'blockquote':
    case 'delete':
    case 'footnote':
    case 'footnoteDefinition':
    case 'linkReference':
    case 'table':
    case 'tableCell':
    case 'tableRow':
      return fromNodes(ctx, node.children);

    // Entirely unsupported; no children to extract
    case 'definition':
    case 'yaml':
    case 'footnoteReference':
    case 'html': // TODO we could parse this
    case 'imageReference':
    case 'thematicBreak':
    case 'textDirective': // Used for ids on list/listItem; then discarded
    case 'leafDirective':
      return [];
  }
};

const fromNodes = (ctx: Ctx, nodes: Content[]) =>
  nodes.flatMap((n) => fromNode(ctx, n));

export const fromMarkdownFile = async (
  filepath: string,
): Promise<PostVersionRequestBody> => {
  const mdFileStr = await fs.readFile(filepath, {
    encoding: 'utf8',
  });

  const slug = basename(filepath).split('.')[0]!;

  const root = parseMarkdown(mdFileStr);
  addPromptIds(root);

  const yaml = getYAML(root);

  const ctx: Ctx = { filepath };

  return {
    docId: yaml['id'],
    draftContent:
      yaml['type'] === 'course'
        ? {
            type: 'course',
            children: fromNodes(ctx, root.children) as DbBlockCourseChild[], // FIXME
            texMacros: yaml['texMacros'] ?? '',
            priceUsdDollars: yaml['priceUsdDollars'] ?? 49,
            slug: slug,
          }
        : {
            type: 'root',
            children: fromNodes(ctx, root.children) as DbBlockLessonChild[], // FIXME
            courseId: yaml['courseId'] ?? '', // TODO take from course page
            texMacros: yaml['texMacros'] ?? '',
            slug: slug,
          },
  };
};
