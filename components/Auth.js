'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else if (!data.session) setMessage('確認メールを送りました。メール内のリンクを開いてからログインしてください。');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage('ログインできませんでした。メールアドレスとパスワードを確認してください。');
    }
    setBusy(false);
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>{mode === 'signup' ? 'アカウントを作る' : 'ログイン'}</h2>
      <label>
        メールアドレス
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        パスワード（8文字以上）
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <div className="row">
        <button type="submit" disabled={busy}>{mode === 'signup' ? '登録する' : 'ログインする'}</button>
        <button type="button" className="quiet" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
          {mode === 'signup' ? 'ログインへ' : '新しく登録する'}
        </button>
      </div>
      {message && <p className="notice">{message}</p>}
    </form>
  );
}
