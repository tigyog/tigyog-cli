import * as fs from 'fs/promises';
import { Content, List, ListItem, Paragraph, Root } from 'mdast';
import { ContainerDirective, LeafDirective } from 'mdast-util-directive';
import * as path from 'path';
import { basename } from 'path';

import {
  addPromptIds,
  getDarkModeStrategy,
  getOptionData,
  getPromptId,
} from './extractDirectiveMetadata.js';
import { getYAML, parseMarkdown } from './parseMarkdown.js';
import { PostVersionRequestBody } from './types/api.js';
import {
  DbBlockBuy,
  DbBlockCourseChild,
  DbBlockCourseRoot,
  DbBlockIframe,
  DbBlockImage,
  DbBlockLessonChild,
  DbBlockLessonLink,
  DbBlockLessonRoot,
  DbBlockLinkChild,
  DbBlockPara,
  DbBlockPaywall,
  DbBlockResponse,
  DbInline,
  DbInlineOption,
  DbNode,
  DbNonRootBlock,
} from './types/db.js';
import { visitTexts } from './visitors.js';

export type Ctx = {
  currentFilePath: string;
  courseId: string;
  imagePathsToKeys: { [filePath: string]: string };
  lessonPathsToIds: { [filePath: string]: string };
};

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

const trimEndMut = (inlines: DbInline[]): DbInline[] => {
  const lastEl = inlines[inlines.length - 1];
  if (lastEl !== undefined && 'text' in lastEl) {
    lastEl.text = lastEl.text.trimEnd();
  }
  return inlines;
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

  const buttonContent = fromNodes(ctx, firstBlock.children) as DbInline[];

  // TigYog shows all whitespace.
  // Presence of :b directives often introduces trailing whitespace, so strip it.
  trimEndMut(buttonContent);

  return [
    {
      type: 'option',
      id: optionData.id,
      children: buttonContent,
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
    const imgPath = path.join(
      path.dirname(ctx.currentFilePath),
      firstChild.url,
    );
    const key = ctx.imagePathsToKeys[imgPath];
    if (!key) throw new Error('Expected image at path: ' + imgPath);

    // Markdown images (like HTML img tags) are considered inline,
    // but TigYog images are blocks.
    return [
      {
        type: 'image',
        key: key,
        children: [{ text: firstChild.alt ?? '' }],
        darkMode: getDarkModeStrategy(node),
      },
    ];
  } else {
    return [
      {
        type: 'p',
        children: fromNodes(ctx, node.children) as DbInline[],
      },
    ];
  }
};

const fromContainerDirective = (
  ctx: Ctx,
  node: ContainerDirective,
): (DbBlockLessonLink | DbBlockIframe)[] => {
  if (node.name === 'chapterlink') {
    let lessonId: string | null = null;
    if (node.attributes && node.attributes['lessonId']) {
      lessonId = node.attributes['lessonId'];
    } else if (node.attributes && node.attributes['path']) {
      const chapterPath = path.join(
        path.dirname(ctx.currentFilePath),
        node.attributes['path'],
      );
      const referencedLessonId = ctx.lessonPathsToIds[chapterPath];
      if (!referencedLessonId)
        throw new Error(
          `Expected chapter at path: ${chapterPath} but only have: ${Object.keys(
            ctx.lessonPathsToIds,
          ).join(', ')}`,
        );
      lessonId = referencedLessonId;
    }
    return [
      {
        type: 'lessonlink',
        children: fromNodes(ctx, node.children) as DbBlockLinkChild[],
        ...(lessonId ? { lessonId: lessonId } : {}),
      },
    ];
  } else if (node.name === 'iframe') {
    const url = node.attributes?.['url'];
    if (url) {
      let initData = '';
      const c = node.children[0];
      if (c && c.type === 'code') {
        initData = c.value;
      }
      return [{ type: 'iframe', url, children: [{ text: initData }] }];
    } else {
      return [];
    }
  } else {
    return [];
  }
};

const fromLeafDirective = (
  ctx: Ctx,
  node: LeafDirective,
): (DbBlockBuy | DbBlockPaywall)[] => {
  if (node.name === 'buy') {
    return [
      {
        type: 'buy',
        children: fromNodes(ctx, node.children) as DbInline[],
      },
    ];
  } else if (node.name === 'paywall') {
    return [
      {
        type: 'paywall',
        children: [{ text: '' }],
      },
    ];
  } else {
    return [];
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
          {
            type: 'h1',
            children: fromNodes(ctx, node.children) as DbInline[],
          },
        ];
      } else {
        return [
          {
            type: 'h2',
            children: fromNodes(ctx, node.children) as DbInline[],
          },
        ];
      }
    case 'image':
      // We support single image within paragraph, but not inline images - skip them
      return [];
    case 'list':
      return fromList(ctx, node);
    case 'listItem':
      return node.children.flatMap((bl): DbNode[] => {
        if (bl.type === 'paragraph') {
          return [
            {
              type: 'p',
              listStyleType: 'disc',
              children: fromNodes(ctx, bl.children) as DbInline[],
            },
          ];
        } else {
          return fromNode(ctx, bl) as DbNode[];
        }
      });
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
      return fromContainerDirective(ctx, node);

    case 'leafDirective':
      return fromLeafDirective(ctx, node);

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
      return [];
  }
};

const fromNodes = (ctx: Ctx, nodes: Content[]): DbNode[] =>
  nodes.flatMap((n) => fromNode(ctx, n));

const courseFromRoot = (
  ctx: Ctx,
  root: Root,
  yaml: { [prop: string]: unknown },
): DbBlockCourseRoot => {
  return {
    type: 'course',
    children: fromNodes(ctx, root.children) as DbBlockCourseChild[], // FIXME
    texMacros: (yaml['texMacros'] as string) ?? '',
    ...(yaml['priceUsdDollars']
      ? { priceUsdDollars: yaml['priceUsdDollars'] as number }
      : {}),
    ...(yaml['slug'] ? { slug: yaml['slug'] as string } : {}),
    ...(yaml['plaintextTitle']
      ? { plaintextTitle: yaml['plaintextTitle'] as string }
      : {}),
  };
};

const lessonFromRoot = (
  ctx: Ctx,
  root: Root,
  yaml: { [prop: string]: unknown },
): DbBlockLessonRoot => {
  return {
    type: 'root',
    children: fromNodes(ctx, root.children) as DbBlockLessonChild[], // FIXME
    courseId: ctx.courseId,
    texMacros: (yaml['texMacros'] as string) ?? '',
    slug: basename(ctx.currentFilePath).split('.')[0]!,
  };
};

// TODO single quotes, dashes
const smartQuotes = (text: string): string => {
  text = text.replace(/"(?=\w|$)/g, '“');
  text = text.replace(/(?<=\w|^)"/g, '”');
  return text;
};

export const fromMarkdownFile = async (
  ctx: Ctx,
): Promise<PostVersionRequestBody> => {
  const fileContent = await fs.readFile(ctx.currentFilePath, {
    encoding: 'utf8',
  });

  // TigYog server demands unix newlines
  // This can be important in e.g. multi-line code blocks
  const unixContent = fileContent.replaceAll(/\r\n/g, '\n');

  const root = parseMarkdown(unixContent);
  addPromptIds(root);

  visitTexts(root, (text) => {
    text.value = smartQuotes(text.value);
  });

  const yaml = getYAML(root);

  const docId = yaml['id'];
  if (typeof docId !== 'string') {
    throw new Error(`Expected id in file ${ctx.currentFilePath}`);
  }

  if (yaml['type'] === 'course') {
    return {
      docId: docId,
      draftContent: courseFromRoot(ctx, root, yaml),
    };
  } else {
    return {
      docId: docId,
      draftContent: lessonFromRoot(ctx, root, yaml),
    };
  }
};
