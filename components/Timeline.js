'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import NoteCard from './NoteCard';

export default function Timeline({ userId }) {
  const [notes, setNotes] = useState(null);
  const [reactions, setReactions] = useState({});
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data: rows, error: e1 } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (e1) {
      setError('タイムラインを読み込めませんでした：' + e1.message);
      setNotes([]);
      return;
    }

    const noteIds = rows.map((r) => r.id);
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const empty = { data: [], error: null };
    const [profRes, reactRes] = await Promise.all([
      userIds.length
        ? supabase.from('profiles').select('id, handle, display_name, avatar_url').in('id', userIds)
        : empty,
      noteIds.length
        ? supabase.from('reactions').select('note_id, user_id, emoji').in('note_id', noteIds)
        : empty,
    ]);

    const problems = [];
    if (profRes.error) problems.push('プロフィールを読み込めませんでした：' + profRes.error.message);
    if (reactRes.error) problems.push('リアクションを読み込めませんでした：' + reactRes.error.message);
    setError(problems.join(' '));

    const byId = Object.fromEntries((profRes.data ?? []).map((p) => [p.id, p]));
    const grouped = {};
    for (const r of reactRes.data ?? []) (grouped[r.note_id] ??= []).push(r);

    setReactions(grouped);
    setNotes(rows.map((r) => ({ ...r, profiles: byId[r.user_id] ?? null })));
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('global-timeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  if (notes === null) return <p className="empty">読み込み中…</p>;
  return (
    <section>
      {error && <p className="notice">{error}</p>}
      {notes.length === 0 && !error && (
        <p className="empty">まだ投稿がありません。最初の1件を書いてみましょう。</p>
      )}
      {notes.map((n) => (
        <NoteCard key={n.id} note={n} reactions={reactions[n.id] ?? []} userId={userId} onChange={load} />
      ))}
    </section>
  );
}
