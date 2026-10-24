'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, safeUrl } from '../../lib/supabase';
import { useSession } from '../../lib/useSession';
import Emoji from '../../components/Emoji';
import RichText from '../../components/RichText';

const LABEL = {
  reaction: 'があなたの投稿にリアクションしました',
  renote: 'があなたの投稿をリノートしました',
  quote: 'があなたの投稿を引用しました',
  reply: 'があなたに返信しました',
  mention: 'があなたをメンションしました',
};

const nameOf = (p) => p?.display_name || p?.handle || '不明なユーザー';

export default function NotificationsPage() {
  const { session, ready } = useSession();
  const userId = session?.user.id;
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data: rows, error: e1 } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (e1) {
      setError('通知を読み込めませんでした：' + e1.message);
      setItems([]);
      return;
    }

    const actorIds = [...new Set(rows.map((r) => r.actor_id))];
    const noteIds = [...new Set(rows.flatMap((r) => [r.note_id, r.target_note_id]).filter(Boolean))];
    const empty = { data: [], error: null };
    const [pRes, nRes] = await Promise.all([
      actorIds.length
        ? supabase.from('profiles').select('id, handle, display_name, avatar_url').in('id', actorIds)
        : empty,
      noteIds.length ? supabase.from('notes').select('id, text, file_urls').in('id', noteIds) : empty,
    ]);
    const profById = Object.fromEntries((pRes.data ?? []).map((p) => [p.id, p]));
    const noteById = Object.fromEntries((nRes.data ?? []).map((n) => [n.id, n]));

    setError('');
    setItems(
      rows.map((r) => ({
        ...r,
        actor: profById[r.actor_id] ?? null,
        // リアクション・リノートは「自分の投稿」、それ以外は「相手の投稿」の内容を見せる
        shown: noteById[r.type === 'renote' ? r.target_note_id : r.note_id] ?? null,
      }))
    );

    // 開いたら既読にする（画面の未読の強調は、この読み込み時点のまま残る）
    if (rows.some((r) => !r.is_read)) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    load();
    const channel = supabase
      .channel('notifications-page-' + userId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  return (
    <div className="shell">
      <header className="top">
        <h1><Link href="/" className="plain">カヤジュッドサイト</Link></h1>
        <Link href="/" className="back">← タイムラインへ</Link>
      </header>

      <h2 className="page-title">通知</h2>

      {!ready ? null : !session ? (
        <p className="empty">ログインすると通知が見られます。</p>
      ) : items === null ? (
        <p className="empty">読み込み中…</p>
      ) : (
        <section>
          {error && <p className="notice">{error}</p>}
          {items.length === 0 && !error && <p className="empty">まだ通知はありません。</p>}
          {items.map((n) => {
            const avatar = safeUrl(n.actor?.avatar_url || '');
            return (
              <article key={n.id} className={'note' + (n.is_read ? '' : ' unread')}>
                <div className="avatar">
                  {avatar ? (
                    <img src={avatar} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span>{nameOf(n.actor).slice(0, 1)}</span>
                  )}
                </div>
                <div className="body">
                  <p className="notif-line">
                    {n.actor?.handle ? (
                      <Link href={`/u/${n.actor.handle}`} className="plain">
                        <strong>{nameOf(n.actor)}</strong>
                      </Link>
                    ) : (
                      <strong>{nameOf(n.actor)}</strong>
                    )}{' '}
                    {LABEL[n.type]}
                    {n.type === 'reaction' && n.emoji && (
                      <>
                        {' '}
                        <Emoji char={n.emoji} />
                      </>
                    )}
                  </p>
                  {n.shown && (
                    <p className="notif-snippet">
                      {n.shown.text ? <RichText text={n.shown.text} /> : '（添付のみの投稿）'}
                    </p>
                  )}
                  <time className="handle">{new Date(n.created_at).toLocaleString('ja-JP')}</time>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
