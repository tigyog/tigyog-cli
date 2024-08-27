// TODO single quotes, dashes

export const smartQuotes = (text: string): string => {
  text = text.replace(/(\W|^)"(\w)/g, '$1“$2');
  text = text.replace(/(\w|[.,!?])"(\W|$)/g, '$1”$2');
  return text;
};
