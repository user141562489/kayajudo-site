'use client';

import { useEffect, useState } from 'react';
import { supabase, safeUrl } from '../lib/supabase';

export default function ProfileEditor({ userId, onSaved, onClose }) {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('handle, display_name, bio, avatar_url, header_url')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) setMessage('プロフィールを読み込めませんでした：' + error.message);
        else
          setForm({
            handle: data.handle,
            display_name: data.display_name,
            bio: data.bio,
            avatar_url: data.avatar_url ?? '',
            header_url: data.header_url ?? '',
          });
      });
  }, [userId]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setMessage('');

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.handle)) {
      setMessage('IDは半角英数字とアンダーバーで、3〜20文字にしてください。');
      return;
    }
    const avatar = form.avatar_url.trim();
    const header = form.header_url.trim();
    if ((avatar && !safeUrl(avatar)) || (header && !safeUrl(header))) {
      setMessage('画像のURLは http:// か https:// で始まるものを入れてください。');
      return;
    }

    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        handle: form.handle,
        display_name: form.display_name.trim(),
        bio: form.bio,
        avatar_url: avatar || null,
        header_url: header || null,
      })
      .eq('id', userId);
    setBusy(false);

    if (error) {
      setMessage(
        error.code === '23505'
          ? 'このIDはすでに使われています。別のIDにしてください。'
          : '保存できませんでした：' + error.message
      );
      return;
    }
    onSaved();
  }

  if (!form) return <div className="panel">{message || '読み込み中…'}</div>;

  const headerPreview = safeUrl(form.header_url.trim());
  const avatarPreview = safeUrl(form.avatar_url.trim());

  return (
    <form className="panel" onSubmit={save}>
      <h2>プロフィール編集</h2>

      <div className="profile-preview">
        <div className="profile-header">
          {headerPreview && <img src={headerPreview} alt="" referrerPolicy="no-referrer" />}
        </div>
        <div className="avatar large">
          {avatarPreview ? (
            <img src={avatarPreview} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span>{(form.display_name || '?').slice(0, 1)}</span>
          )}
        </div>
      </div>

      <label>
        名前
        <input value={form.display_name} maxLength={30} onChange={set('display_name')} />
      </label>
      <label>
        ID（半角英数字と _ ／ 3〜20文字）
        <input value={form.handle} maxLength={20} onChange={set('handle')} />
      </label>
      <label>
        自己紹介
        <textarea rows={4} maxLength={300} value={form.bio} onChange={set('bio')} />
      </label>
      <label>
        アイコン画像のURL
        <input value={form.avatar_url} onChange={set('avatar_url')} placeholder="https://..." />
      </label>
      <label>
        ヘッダー画像のURL
        <input value={form.header_url} onChange={set('header_url')} placeholder="https://..." />
      </label>

      <div className="row">
        <button type="submit" disabled={busy}>保存する</button>
        <button type="button" className="quiet" onClick={onClose}>閉じる</button>
        {message && <span className="notice">{message}</span>}
      </div>
    </form>
  );
}
