import { customAlphabet } from 'nanoid';

// Must be compatible with:
// - Stripe IDs
// - URL slugs (incl domain name parts - case-insensitive)
// - Other unforeseen places - e.g. in Markdown text directives, variable names

const SAFE_ID_START_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const SAFE_ID_REST_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function makeRandomId() {
  return (
    customAlphabet(SAFE_ID_START_ALPHABET)(1) +
    customAlphabet(SAFE_ID_REST_ALPHABET)(4)
  );
}

export const makePromptId = makeRandomId;
export const makeOptionId = makeRandomId;
export const makeCourseId = () =>
  'C-' + customAlphabet(SAFE_ID_REST_ALPHABET)(10);
export const makeChapterId = () =>
  'L-' + customAlphabet(SAFE_ID_REST_ALPHABET)(10);
