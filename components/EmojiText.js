import Emoji from './Emoji';

// 絵文字（国旗・肌色・結合絵文字・キーキャップを含む）にマッチする。かっこは全体を囲む1組だけ
const EMOJI =
  /((?:\p{Regional_Indicator}{2})|(?:[#*0-9]\uFE0F?\u20E3)|(?:\p{Extended_Pictographic}[\uFE0F\u{1F3FB}-\u{1F3FF}]?(?:\u200D\p{Extended_Pictographic}[\uFE0F\u{1F3FB}-\u{1F3FF}]?)*))/gu;

// 先頭の1文字（絵文字の途中で切れないように）
export function initialOf(name) {
  return Array.from(name ?? '')[0] ?? '?';
}

// 文字数で切り詰める（絵文字の途中で切れないように）
export function clip(text, max) {
  const chars = Array.from(text ?? '');
  return chars.length > max ? chars.slice(0, max).join('') + '…' : chars.join('');
}

// 文章中の絵文字を Twemoji の画像にする
export default function EmojiText({ text }) {
  if (!text) return null;
  return text.split(EMOJI).map((part, i) => (i % 2 === 1 ? <Emoji key={i} char={part} /> : part));
}
