import { Root } from 'mdast';
import remarkDirective from 'remark-directive';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

export function stringifyMarkdownRoot(root: Root): string {
  const processor = unified()
    .use(remarkStringify, {
      listItemIndent: 'one',
      bullet: '-', // to match VS Code's default Markdown formatter (Shift+Alt+F)
      emphasis: '_', // to match VS Code's default Markdown formatter (Shift+Alt+F)
      fences: true, // to match VS Code's default Markdown formatter (Shift+Alt+F)
    })
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkMath)
    .use(remarkDirective);
  return processor.stringify(root);
}
