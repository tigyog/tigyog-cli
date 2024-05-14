export type DbBlockRoot = DbBlockLessonRoot | DbBlockCourseRoot;

export type DbNonRootBlock = DbBlockLessonChild | DbBlockCourseChild;

export type DbBlockLessonRoot = {
  type: 'root'; // TODO rename this
  children: DbBlockLessonChild[];
  courseId: string; // Store this in the doc for doc history
  texMacros: string;
  plaintextTitle?: string;
  slug?: string; // This is a request; only confirmed at publish time.
};

export type DbBlockLessonChild =
  | DbBlockPara
  | DbBlockH1
  | DbBlockH2
  | DbBlockAccountLink
  | DbBlockPrompt
  | DbBlockResponse
  | DbBlockImage
  | DbBlockMath
  | DbBlockCode
  | DbBlockIframe
  | DbBlockPaywall
  | DbBlockComment
  | DbBlockCallout;

export type DbBlockCourseRoot = {
  type: 'course';
  children: DbBlockCourseChild[];
  texMacros: string;
  plaintextTitle?: string;
  priceUsdDollars?: number; // Absence means free
  slug?: string; // This is a request; only confirmed at publish time.
};

export type DbBlockCourseChild =
  | DbBlockPara
  | DbBlockH1
  | DbBlockH2
  | DbBlockAccountLink
  | DbBlockImage
  | DbBlockMath
  | DbBlockCode
  | DbBlockBuy
  | DbBlockLessonLink
  | DbBlockComment
  | DbBlockCallout;

export type DbBlockPara = {
  type: 'p';
  children: DbInline[];
  listStyleType?: 'disc';
};
export type DbBlockH1 = { type: 'h1'; children: DbInline[] };
export type DbBlockH2 = { type: 'h2'; children: DbInline[] };
type DbBlockAccountLink = { type: 'accountlink'; children: DbInline[] };
export type DbBlockPrompt = {
  type: 'prompt';
  children: DbInline[];
  id: string;
};
export type DbBlockResponse = {
  type: 'response';
  children: DbNonRootBlock[];
  toPromptId: string;
  optionIds: string[];
};
export const DarkModeStrategies = ['light_bg', 'no_bg', 'invert'] as const;
export type DarkModeStrategy = (typeof DarkModeStrategies)[number];
export type DbBlockImage = {
  type: 'image';
  children: DbInline[];
  key: string;

  darkMode?: DarkModeStrategy; // Defaults to 'light_bg'
};
export type DbBlockMath = {
  type: 'blockmath';
  children: DbFormattedText[];
};

export type DbBlockCode = {
  type: 'blockcode';

  // Can be unknown language. Allows importing Markdown with unknown languages.
  // Fall back to plaintext highlighting.
  language?: string;

  children: [DbPlainText];
};
export type DbBlockLinkChild =
  | DbBlockH1
  | DbBlockH2
  | DbBlockPara
  | DbBlockImage;
export type DbBlockLessonLink = {
  type: 'lessonlink';
  children: DbBlockLinkChild[];
  lessonId?: string; // Optional: useful for dummy lesson link when pre-selling
};
export type DbBlockIframe = {
  type: 'iframe';
  children: [DbPlainText]; // Data passed to iframe
  url: string;
};
export type DbBlockBuy = {
  type: 'buy';
  children: DbInline[];
};
export type DbBlockPaywall = {
  type: 'paywall';
  children: DbInline[];
};
export type DbBlockComment = {
  // TODO deprecate in favor of callout? Not sure it's required
  type: 'comment';
  children: DbNonRootBlock[];
};
export type DbBlockCallout = {
  type: 'callout';
  children: DbNonRootBlock[];
};

export type DbInlineOption = {
  type: 'option';
  children: DbInline[];
  id: string;

  // `correct: boolean|null` would be better, but Slate does not allow null as property values.
  // We could correct this in conversion to/from editor schema, but just concede the change to db schema.
  correct?: boolean;
};
export type DbInlineLink = {
  type: 'link';
  children: DbInline[];
  href: string;
};
export type DbInlineMath = {
  type: 'inlinemath';
  children: DbFormattedText[];
};
export type DbInlineCode = {
  type: 'inlinecode';
  children: [DbPlainText];
};
export type DbInlineBreak = {
  type: 'br';
  children: [DbDummyText];
};

export type DbBlock =
  | DbBlockLessonRoot
  | DbBlockCourseRoot
  | DbBlockPara
  | DbBlockH1
  | DbBlockH2
  | DbBlockAccountLink
  | DbBlockPrompt
  | DbBlockResponse
  | DbBlockImage
  | DbBlockMath
  | DbBlockCode
  | DbBlockLessonLink
  | DbBlockBuy
  | DbBlockPaywall
  | DbBlockComment
  | DbBlockCallout
  | DbBlockIframe;
export type DbInlineEl =
  | DbInlineOption
  | DbInlineMath
  | DbInlineCode
  | DbInlineLink
  | DbInlineBreak;
export type DbEl = DbBlock | DbInlineEl;
export type DbFormattedText = { text: string; bold?: true; italic?: true };
export type DbPlainText = { text: string };
type DbDummyText = { text: '' };
export type DbInline = DbInlineEl | DbFormattedText;
export type DbNode = DbEl | DbFormattedText;
