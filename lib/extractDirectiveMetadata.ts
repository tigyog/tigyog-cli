import { Root, List, Paragraph } from 'mdast';
import { visitLists } from './visitors.js';

export const getOptionData = (
  p: Paragraph,
): { id: string; correct: boolean | null } | null => {
  for (const c of p.children) {
    if (
      c.type === 'textDirective' &&
      c.name === 'b' &&
      c.attributes &&
      c.attributes['id']
    ) {
      return {
        id: c.attributes['id'],
        correct:
          c.attributes['class'] === 'correct'
            ? true
            : c.attributes['class'] === 'incorrect'
            ? false
            : null,
      };
    }
  }
  return null;
};

export const addPromptIds = (root: Root): void => {
  visitLists(root, (list, i, parent) => {
    if (!parent) return;
    if (i === null) return;
    const prev = parent.children[i - 1];
    if (!prev) return;
    if (prev.type !== 'paragraph') return;
    for (const c of prev.children) {
      if (
        c.type === 'textDirective' &&
        c.name === 'buttons' &&
        c.attributes &&
        c.attributes['id']
      ) {
        if (!list.data) list.data = {};
        list.data['id'] = c.attributes['id'];
      }
    }
    return undefined;
  });
};

export const getPromptId = (list: List): string | null => {
  if (list.data && list.data['id']) {
    const data = list.data;
    return data['id'] as string;
  }

  // Fall back to id of first option
  const listItem = list.children[0];
  if (!listItem) return null;
  const optionData = getOptionData(listItem.children[0] as Paragraph);
  if (!optionData) return null;
  return optionData.id;
};
