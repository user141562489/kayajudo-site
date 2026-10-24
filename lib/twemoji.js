// 絵文字 → Twemoji(SVG)のURL。ZWJ（結合）を含まない絵文字は fe0f を取り除く
export function emojiUrl(emoji) {
  const cps = Array.from(emoji, (ch) => ch.codePointAt(0).toString(16));
  const parts = cps.includes('200d') ? cps : cps.filter((c) => c !== 'fe0f');
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${parts.join('-')}.svg`;
}
