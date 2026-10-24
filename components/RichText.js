import Link from 'next/link';
import EmojiText from './EmojiText';
import { URL_SOURCE, trimUrl } from '../lib/urls';
import { safeUrl } from '../lib/supabase';

const MENTION_SOURCE = '(?<![A-Za-z0-9_])@[a-zA-Z0-9_]{3,20}';
const TOKEN = new RegExp(`(${URL_SOURCE}|${MENTION_SOURCE})`, 'g');
const IS_MENTION = /^@[a-zA-Z0-9_]{3,20}$/;
const IS_URL = /^https?:\/\//;

// 本文を表示する：@ID はプロフィールへのリンク、URL は押せるリンク、絵文字は Twemoji
export default function RichText({ text }) {
  return text.split(TOKEN).map((part, i) => {
    if (i % 2 === 0) return <EmojiText key={i} text={part} />;
    if (IS_MENTION.test(part)) {
      return (
        <Link key={i} href={`/u/${part.slice(1)}`} className="mention">
          {part}
        </Link>
      );
    }
    if (IS_URL.test(part)) {
      const clean = trimUrl(part);
      const href = safeUrl(clean);
      if (!href) return part;
      return (
        <span key={i}>
          <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="autolink">
            {clean}
          </a>
          {part.slice(clean.length)}
        </span>
      );
    }
    return part;
  });
}
