import { Root } from 'mdast';
import remarkDirective from 'remark-directive';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import * as ymlLib from 'yaml';

export const getYAML = (rootNode: Root): { [prop: string]: unknown } => {
  for (const c of rootNode.children) {
    if (c.type === 'yaml') {
      return ymlLib.parse(c.value);
    }
  }
  return {};
};

export const setYAML = (rootNode: Root, yaml: any): void => {
  for (const c of rootNode.children) {
    if (c.type === 'yaml') {
      c.value = ymlLib.stringify(yaml).trimEnd();
      return;
    }
  }
};

export const parseMarkdown = (md: string): Root => {
  const processor = unified()
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkDirective);
  const root = processor.parse(md);
  return root;
};
