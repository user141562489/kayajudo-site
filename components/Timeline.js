'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import NoteCard from './NoteCard';

// authorId: その人の投稿だけ / focusId: その投稿と、それへの返信
export default function Timeline({ userId, authorId, focusId, onReply, onQuote, emptyText }) {
  const [notes, setNotes] = useState(null);
  const [byId, setById] = useState({});
  const [reactionsMap, setReactionsMap] = useState({});
  const [myRenotes, setMyRenotes] = useState({});
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    let query = supabase.from('notes').select('*');
    if (focusId) {
      query = query
        .or(`id.eq.${focusId},reply_to.eq.${focusId}`)
        .order('created_at', { ascending: true })
        .limit(100);
    } else {
      query = query.order('created_at', { ascending: false }).limit(50);
      if (authorId) query = query.eq('user_id', authorId);
    }
    const { data: rows, error: e1 } = await query;
    if (e1) {
      setError('タイムラインを読み込めませんでした：' + e1.message);
      setNotes([]);
      return;
    }

    const problems = [];

    // 返信・リノートの元になった投稿を、2段階まで読み込む
    let all = rows;
    for (let depth = 0; depth < 2; depth++) {
      const known = new Set(all.map((n) => n.id));
      const need = [
        ...new Set(
          all.flatMap((n) => [n.renote_of, n.reply_to]).filter((id) => id && !known.has(id))
        ),
      ];
      if (need.length === 0) break;
      const { data, error } = await supabase.from('notes').select('*').in('id', need);
      if (error) {
        problems.push('元の投稿を読み込めませんでした：' + error.message);
        break;
      }
      all = [...all, ...data];
    }

    const userIds = [...new Set(all.map((n) => n.user_id))];
    const noteIds = all.map((n) => n.id);
    const empty = { data: [], error: null };
    const [profRes, reactRes, renoteRes] = await Promise.all([
      userIds.length
        ? supabase.from('profiles').select('id, handle, display_name, avatar_url').in('id', userIds)
        : empty,
      noteIds.length
        ? supabase.from('reactions').select('note_id, user_id, emoji').in('note_id', noteIds)
        : empty,
      userId && noteIds.length
        ? supabase
            .from('notes')
            .select('id, renote_of, text, file_urls')
            .eq('user_id', userId)
            .in('renote_of', noteIds)
        : empty,
    ]);
    if (profRes.error) problems.push('プロフィールを読み込めませんでした：' + profRes.error.message);
    if (reactRes.error) problems.push('リアクションを読み込めませんでした：' + reactRes.error.message);
    setError(problems.join(' '));

    const profById = Object.fromEntries((profRes.data ?? []).map((p) => [p.id, p]));
    const withProfile = all.map((n) => ({ ...n, profiles: profById[n.user_id] ?? null }));
    const lookup = Object.fromEntries(withProfile.map((n) => [n.id, n]));

    const grouped = {};
    for (const r of reactRes.data ?? []) (grouped[r.note_id] ??= []).push(r);

    // 自分がリノートだけした投稿：元の投稿ID → そのリノートのID
    const mine = {};
    for (const r of renoteRes.data ?? []) {
      if (!r.text && !(r.file_urls?.length > 0)) mine[r.renote_of] = r.id;
    }

    setById(lookup);
    setReactionsMap(grouped);
    setMyRenotes(mine);
    setNotes(rows.map((r) => lookup[r.id]));
  }, [authorId, focusId, userId]);

  useEffect(() => {
    load();
    const scope = focusId ?? authorId ?? 'all';
    const channel = supabase
      .channel('timeline-' + scope)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, focusId, authorId]);

  if (notes === null) return <p className="empty">読み込み中…</p>;
  return (
    <section>
      {error && <p className="notice">{error}</p>}
      {notes.length === 0 && !error && (
        <p className="empty">{emptyText ?? 'まだ投稿がありません。最初の1件を書いてみましょう。'}</p>
      )}
      {notes.map((n, i) => (
        <Fragment key={n.id}>
          {focusId && i === 1 && <h3 className="replies-title">返信</h3>}
          <NoteCard
            note={n}
            byId={byId}
            reactionsMap={reactionsMap}
            myRenotes={myRenotes}
            focusId={focusId}
            userId={userId}
            onChange={load}
            onReply={onReply}
            onQuote={onQuote}
          />
        </Fragment>
      ))}
    </section>
  );
}
