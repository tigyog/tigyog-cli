// TODO dashes

export const smartQuotes = (text: string): string => {
  // Double quotes
  text = text.replace(/(\W|^)"(\w)/g, '$1“$2');
  text = text.replace(/(\w|[.,!?])"(\W|$)/g, '$1”$2');

  // Single quotes
  text = text.replace(/(\W|^)'(\w)/g, '$1‘$2');
  text = text.replace(/(\w|[.,!?])'(\W|$)/g, '$1’$2');

  // Apostrophe
  text = text.replace(/(\w)'(\w)/g, '$1’$2');

  return text;
};
