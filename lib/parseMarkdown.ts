import { Root } from 'mdast';
import remarkDirective from 'remark-directive';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import * as ymlLib from 'yaml';

export const getYAML = (rootNode: Root): { [prop: string]: unknown } => {
  for (const [i, c] of rootNode.children.entries()) {
    if (c.type === 'yaml') {
      rootNode.children.splice(i, 1);
      return ymlLib.parse(c.value);
    }
  }
  return {};
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
