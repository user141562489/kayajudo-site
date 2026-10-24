'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase, safeUrl } from '../lib/supabase';

export default function Composer({ userId, target, onClearTarget }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    if (target) textRef.current?.focus();
  }, [target]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    const lines = files.split('\n').map((s) => s.trim()).filter(Boolean);
    const urls = lines.map(safeUrl);
    if (urls.some((u) => !u)) {
      setError('添付URLは http:// か https:// で始まるものを1行に1つ入れてください。');
      return;
    }
    if (target?.kind === 'quote' && !text.trim()) {
      setError('引用するときは本文を書いてください。（本文なしで共有するときは「リノート」を使います）');
      return;
    }
    if (!text.trim() && urls.length === 0) return;

    const row = { user_id: userId, text: text.trim(), file_urls: urls };
    if (target?.kind === 'reply') row.reply_to = target.note.id;
    if (target?.kind === 'quote') row.renote_of = target.note.id;

    setBusy(true);
    const { error } = await supabase.from('notes').insert(row);
    setBusy(false);
    if (error) {
      setError('投稿できませんでした：' + error.message);
      return;
    }
    setText('');
    setFiles('');
    onClearTarget();
  }

  const targetName = target?.note.profiles?.display_name || target?.note.profiles?.handle || '';

  return (
    <form className="panel" onSubmit={submit}>
      {target && (
        <div className="target-banner">
          <span>
            {target.kind === 'reply' ? '返信先' : '引用元'}：{targetName}　
            {(target.note.text || '（添付のみの投稿）').slice(0, 60)}
          </span>
          <button type="button" className="quiet" onClick={onClearTarget}>やめる</button>
        </div>
      )}
      <textarea
        ref={textRef}
        placeholder={target?.kind === 'reply' ? '返信を書く' : target?.kind === 'quote' ? '引用にコメントを添える' : 'いまどうしてる？'}
        rows={3}
        maxLength={3000}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <textarea
        className="urls"
        placeholder="添付ファイルのURL（1行に1つ）"
        rows={2}
        value={files}
        onChange={(e) => setFiles(e.target.value)}
      />
      <div className="row">
        <button type="submit" disabled={busy}>
          {target?.kind === 'reply' ? '返信する' : target?.kind === 'quote' ? '引用して投稿' : '投稿する'}
        </button>
        {error && <span className="notice">{error}</span>}
      </div>
    </form>
  );
}
