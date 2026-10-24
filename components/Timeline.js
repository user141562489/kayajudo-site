'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import NoteCard from './NoteCard';

export default function Timeline() {
  const [notes, setNotes] = useState(null);
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

    const ids = [...new Set(rows.map((r) => r.user_id))];
    let byId = {};
    if (ids.length > 0) {
      const { data: profs, error: e2 } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url')
        .in('id', ids);
      if (e2) setError('プロフィールを読み込めませんでした：' + e2.message);
      byId = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
    }

    setError((prev) => (prev.startsWith('プロフィール') ? prev : ''));
    setNotes(rows.map((r) => ({ ...r, profiles: byId[r.user_id] ?? null })));
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('global-timeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, load)
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
      {notes.map((n) => <NoteCard key={n.id} note={n} />)}
    </section>
  );
}
