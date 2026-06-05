export function getTeaserHook(text, lineCount = 2) {
  if (!text) return '';

  const paragraphs = text.split(/\n+/).filter(Boolean);
  if (paragraphs.length >= lineCount) {
    return paragraphs.slice(0, lineCount).join('\n');
  }

  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  if (sentences.length >= lineCount) {
    return sentences.slice(0, lineCount).join(' ').trim();
  }

  return text;
}
