'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import NoteCard from './NoteCard';

export default function Timeline() {
  const [notes, setNotes] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('notes')
      .select('*, profiles(handle, display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);
    setNotes(data ?? []);
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
  if (notes.length === 0) return <p className="empty">まだ投稿がありません。最初の1件を書いてみましょう。</p>;
  return <section>{notes.map((n) => <NoteCard key={n.id} note={n} />)}</section>;
}
