/**
 * Text cleaning — strips noise while preserving the author's authentic voice.
 */

export function cleanText(text: string): string {
  let t = text;

  // Collapse horizontal whitespace but preserve paragraph breaks
  t = t.replace(/[^\S\n]+/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.trim();

  // Remove URLs
  t = t.replace(/https?:\/\/\S+/g, '');

  // Remove Reddit markdown artifacts
  t = t.replace(/\*{1,2}(.*?)\*{1,2}/g, '$1');    // bold/italic
  t = t.replace(/~~(.*?)~~/g, '$1');                // strikethrough
  t = t.replace(/^#{1,6}\s+/gm, '');               // headers
  t = t.replace(/^>.*$/gm, '');                       // blockquotes
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');    // links → anchor text

  // Remove common Reddit noise prefixes
  t = t.replace(/^(edit|update|eta|tl;?dr):?\s*/gim, '');
  t = t.replace(/^(source|sauce):?\s*$/gim, '');

  return t.trim();
}
