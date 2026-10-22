'use client';

import { useState } from 'react';
import { supabase, safeUrl } from '../lib/supabase';

export default function Composer({ userId }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    const lines = files.split('\n').map((s) => s.trim()).filter(Boolean);
    const urls = lines.map(safeUrl);
    if (urls.some((u) => !u)) {
      setError('添付URLは http:// か https:// で始まるものを1行に1つ入れてください。');
      return;
    }
    if (!text.trim() && urls.length === 0) return;

    setBusy(true);
    const { error } = await supabase
      .from('notes')
      .insert({ user_id: userId, text: text.trim(), file_urls: urls });
    setBusy(false);
    if (error) {
      setError('投稿できませんでした：' + error.message);
      return;
    }
    setText('');
    setFiles('');
  }

  return (
    <form className="panel" onSubmit={submit}>
      <textarea
        placeholder="いまどうしてる？"
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
        <button type="submit" disabled={busy}>投稿する</button>
        {error && <span className="notice">{error}</span>}
      </div>
    </form>
  );
}
