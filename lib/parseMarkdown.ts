import { Root } from 'mdast';
import remarkDirective from 'remark-directive';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import * as ymlLib from 'yaml';

export const getYAML = (rootNode: Root): { [prop: string]: unknown } => {
  const c = rootNode.children[0];
  if (c && c.type === 'yaml') {
    const yaml = ymlLib.parse(c.value);
    if (yaml) {
      return yaml;
    }
  }
  return {};
};

export const setYAML = (rootNode: Root, yaml: any): void => {
  const newVal = ymlLib.stringify(yaml).trimEnd();
  const c = rootNode.children[0];
  if (c && c.type === 'yaml') {
    c.value = newVal;
  } else {
    rootNode.children.unshift({ type: 'yaml', value: newVal });
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
