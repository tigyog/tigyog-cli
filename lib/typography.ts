// TODO single quotes, dashes
export const smartQuotes = (text: string): string => {
  text = text.replace(/"(?=\w|$)/g, '“');
  text = text.replace(/(?<=\w|^)"/g, '”');
  return text;
};
