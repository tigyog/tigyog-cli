import * as fs from 'fs/promises';
import { Root, Content, List, ListItem, Paragraph } from 'mdast';
import { ContainerDirective } from 'mdast-util-directive';
import * as path from 'path';
import { basename } from 'path';

import { postCasFile } from './casClient.js';
import {
  addPromptIds,
  getOptionData,
  getPromptId,
} from './extractDirectiveMetadata.js';
import { getYAML, parseMarkdown } from './parseMarkdown.js';
import { publishMarkdownFile } from './publish.js';
import { PostVersionRequestBody } from './types/api.js';
import {
  DbBlockCourseChild,
  DbBlockCourseRoot,
  DbBlockImage,
  DbBlockLessonChild,
  DbBlockLessonLink,
  DbBlockLessonRoot,
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

const trimEndMut = (inlines: DbInline[]): DbInline[] => {
  const lastEl = inlines[inlines.length - 1];
  if (lastEl !== undefined && 'text' in lastEl) {
    lastEl.text = lastEl.text.trimEnd();
  }
  return inlines;
};

const listItemToOption = async (
  ctx: Ctx,
  promptId: string,
  listItem: ListItem,
): Promise<[DbInlineOption, DbBlockResponse[]]> => {
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

  const buttonContent = (await fromNodes(
    ctx,
    firstBlock.children,
  )) as DbInline[];

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
            children: (await fromNodes(ctx, rest)) as DbNonRootBlock[],
          },
        ]
      : [],
  ];
};

const fromList = async (ctx: Ctx, node: List): Promise<DbNonRootBlock[]> => {
  const promptId = getPromptId(node);
  if (promptId) {
    const out = await Promise.all(
      node.children.map((li) => listItemToOption(ctx, promptId, li)),
    );
    return [
      { type: 'prompt', id: promptId, children: out.map((o) => o[0]) },
      ...out.flatMap((o) => o[1]),
    ];
  } else {
    return (await fromNodes(ctx, node.children)) as DbNonRootBlock[];
  }
};

const fromParagraph = async (
  ctx: Ctx,
  node: Paragraph,
): Promise<(DbBlockPara | DbBlockImage)[]> => {
  const firstChild = node.children[0];
  if (firstChild && firstChild.type === 'image') {
    const imgPath = path.join(path.dirname(ctx.filepath), firstChild.url);
    const key = await postCasFile(imgPath);

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
      {
        type: 'p',
        children: (await fromNodes(ctx, node.children)) as DbInline[],
      },
    ];
  }
};

const fromContainerDirective = async (
  ctx: Ctx,
  node: ContainerDirective,
): Promise<DbBlockLessonLink[]> => {
  if (node.name === 'chapterlink') {
    let lessonId = null;
    if (node.attributes && node.attributes['path']) {
      const chapterPath = path.join(
        path.dirname(ctx.filepath),
        node.attributes['path'],
      );
      lessonId = await publishMarkdownFile(chapterPath);
    }
    return [
      {
        type: 'lessonlink',
        children: (await fromNodes(ctx, node.children)) as DbBlockLinkChild[],
        ...(lessonId ? { lessonId: lessonId } : {}),
      },
    ];
  } else {
    return [];
  }
};
const fromNode = async (ctx: Ctx, node: Content): Promise<DbNode[]> => {
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
            children: (await fromNodes(ctx, node.children)) as DbInline[],
          },
        ];
      } else {
        return [
          {
            type: 'h2',
            children: (await fromNodes(ctx, node.children)) as DbInline[],
          },
        ];
      }
    case 'image':
      // We support single image within paragraph, but not inline images - skip them
      return [];
    case 'list':
      return fromList(ctx, node);
    case 'listItem':
      return Promise.all(
        node.children.map(async (bl): Promise<DbNode[]> => {
          if (bl.type === 'paragraph') {
            return [
              {
                type: 'p',
                listStyleType: 'disc',
                children: (await fromNodes(ctx, bl.children)) as DbInline[],
              },
            ];
          } else {
            return (await fromNode(ctx, bl)) as DbNode[];
          }
        }),
      ).then((x) => x.flat(1));
    case 'math':
      return [{ type: 'blockmath', children: [{ text: node.value }] }];
    case 'paragraph':
      return fromParagraph(ctx, node);

    // Inline elements
    case 'break':
      return [{ type: 'br', children: [{ text: '' }] }];
    case 'emphasis':
      return (await fromNodes(ctx, node.children)).map(italicize);
    case 'inlineCode':
      return [{ type: 'inlinecode', children: [{ text: node.value }] }];
    case 'inlineMath':
      return [{ type: 'inlinemath', children: [{ text: node.value }] }];
    case 'link':
      return [
        {
          type: 'link',
          href: node.url,
          children: (await fromNodes(ctx, node.children)) as DbInline[],
        },
      ];
    case 'strong':
      return (await fromNodes(ctx, node.children)).map(bolden);
    case 'text':
      return [{ text: node.value.replaceAll(/[\r\n]/g, ' ') }];

    case 'containerDirective':
      return fromContainerDirective(ctx, node);

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

const fromNodes = (ctx: Ctx, nodes: Content[]): Promise<DbNode[]> =>
  Promise.all(nodes.map((n) => fromNode(ctx, n))).then((x) => x.flat(1));

const courseFromRoot = async (
  ctx: Ctx,
  root: Root,
  yaml: { [prop: string]: unknown },
): Promise<DbBlockCourseRoot> => {
  return {
    type: 'course',
    children: (await fromNodes(ctx, root.children)) as DbBlockCourseChild[], // FIXME
    texMacros: (yaml['texMacros'] as string) ?? '',
    priceUsdDollars: (yaml['priceUsdDollars'] as number) ?? 49,
    ...(yaml['slug'] ? { slug: yaml['slug'] as string } : {}),
  };
};

const lessonFromRoot = async (
  ctx: Ctx,
  root: Root,
  yaml: { [prop: string]: unknown },
): Promise<DbBlockLessonRoot> => {
  if (courseId === undefined) throw new Error('Expected courseId to be set');
  return {
    type: 'root',
    children: (await fromNodes(ctx, root.children)) as DbBlockLessonChild[], // FIXME
    courseId: courseId,
    texMacros: (yaml['texMacros'] as string) ?? '',
    slug: basename(ctx.filepath).split('.')[0]!,
  };
};

// Hack alert: global variable set when encountering course file, so that chapters can reference it.
let courseId: string | undefined = undefined;

export const fromMarkdownFile = async (
  filepath: string,
): Promise<PostVersionRequestBody> => {
  const mdFileStr = await fs.readFile(filepath, {
    encoding: 'utf8',
  });

  const root = parseMarkdown(mdFileStr);
  addPromptIds(root);

  const yaml = getYAML(root);

  const docId = yaml['id'];
  if (typeof docId !== 'string') {
    throw new Error(`Expected id in file ${filepath}`);
  }

  const ctx: Ctx = { filepath };

  if (yaml['type'] === 'course') {
    courseId = docId;

    return {
      docId: docId,
      draftContent: await courseFromRoot(ctx, root, yaml),
    };
  } else {
    return {
      docId: docId,
      draftContent: await lessonFromRoot(ctx, root, yaml),
    };
  }
};
