import { safeUrl } from '../lib/supabase';

export function kindOf(href) {
  const path = new URL(href).pathname.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(path)) return 'image';
  if (/\.(mp4|webm|mov|m4v|ogv)$/.test(path)) return 'video';
  if (/\.(mp3|wav|ogg|oga|m4a|flac|aac|opus)$/.test(path)) return 'audio';
  return 'file';
}

export default function Attachment({ url }) {
  const href = safeUrl(url);
  if (!href) return null;
  const kind = kindOf(href);
  const name = decodeURIComponent(new URL(href).pathname.split('/').pop() || href);

  if (kind === 'image') return <img className="media" src={href} alt={name} loading="lazy" referrerPolicy="no-referrer" />;
  if (kind === 'video') return <video className="media" src={href} controls preload="metadata" />;
  if (kind === 'audio') return <audio className="audio" src={href} controls preload="metadata" />;
  return (
    <a className="download" href={href} download target="_blank" rel="noopener noreferrer nofollow">
      ダウンロード：{name}
    </a>
  );
}
