import {
  Blockquote,
  Delete,
  Emphasis,
  Footnote,
  FootnoteDefinition,
  Heading,
  Link,
  LinkReference,
  List,
  ListItem,
  Paragraph,
  Root,
  Strong,
  TableCell,
  Text,
} from 'mdast';
import {
  ContainerDirective,
  LeafDirective,
  TextDirective,
} from 'mdast-util-directive';
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
  ) => number | void,
): void => {
  visit(root, 'list', visitor);
};

export const visitTexts = (
  root: Root,
  visitor: (
    text: Text,
    i: number | null,
    parent:
      | Root
      | Paragraph
      | Heading
      | LeafDirective
      | TableCell
      | Link
      | LinkReference
      | Emphasis
      | Strong
      | Delete
      | Footnote
      | TextDirective
      | null,
  ) => number | void,
): void => {
  visit(root, 'text', visitor);
};
