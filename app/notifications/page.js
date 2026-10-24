'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, safeUrl } from '../../lib/supabase';
import { useSession } from '../../lib/useSession';
import { LABEL, linkOf, loadNotifications } from '../../lib/notifications';
import Emoji from '../../components/Emoji';
import EmojiText, { clip, initialOf } from '../../components/EmojiText';

const nameOf = (p) => p?.display_name || p?.handle || '不明なユーザー';

export default function NotificationsPage() {
  const { session, ready } = useSession();
  const userId = session?.user.id;
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { items, error } = await loadNotifications(userId, 50);
    setError(error);
    setItems(items);

    // 開いたら既読にする（画面の未読の強調は、この読み込み時点のまま残る）
    if (items.some((n) => !n.is_read)) {
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
    <>
      <div className="page-head">
        <h2>通知</h2>
      </div>

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
            const href = linkOf(n);
            return (
              <article key={n.id} className={'note' + (n.is_read ? '' : ' unread')}>
                <div className="avatar">
                  {avatar ? (
                    <img src={avatar} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span>
                      <EmojiText text={initialOf(nameOf(n.actor))} />
                    </span>
                  )}
                </div>
                <div className="body">
                  <p className="notif-line">
                    {n.actor?.handle ? (
                      <Link href={`/u/${n.actor.handle}`} className="plain">
                        <strong>
                          <EmojiText text={nameOf(n.actor)} />
                        </strong>
                      </Link>
                    ) : (
                      <strong>
                        <EmojiText text={nameOf(n.actor)} />
                      </strong>
                    )}
                    {LABEL[n.type]}
                    {n.type === 'reaction' && n.emoji && (
                      <>
                        {' '}
                        <Emoji char={n.emoji} />
                      </>
                    )}
                  </p>
                  {n.shown &&
                    (href ? (
                      <Link href={href} className="notif-snippet-link">
                        <span className="notif-snippet">
                          {n.shown.text ? <EmojiText text={clip(n.shown.text, 140)} /> : '（添付のみの投稿）'}
                        </span>
                      </Link>
                    ) : (
                      <span className="notif-snippet">
                        {n.shown.text ? <EmojiText text={clip(n.shown.text, 140)} /> : '（添付のみの投稿）'}
                      </span>
                    ))}
                  <time className="handle">{new Date(n.created_at).toLocaleString('ja-JP')}</time>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
