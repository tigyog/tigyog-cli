import { Blockquote, FootnoteDefinition, List, ListItem, Root } from 'mdast';
import { ContainerDirective } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';

/*
This module is a workaround for a weird bug.
TypeScript type-checking (particularly in VS Code via LSP)
is incredibly slow (~12 seconds) when using the visit function.
So we move all usages into this module.
Type-checking is still slow for this module,
but when this module is not open, others type-check fast.
*/

export const visitLists = (
  root: Root,
  visitor: (
    list: List,
    i: number | null,
    parent:
      | Root
      | Blockquote
      | ContainerDirective
      | FootnoteDefinition
      | ListItem
      | null,
  ) => void,
): void => {
  visit(root, 'list', visitor);
};
