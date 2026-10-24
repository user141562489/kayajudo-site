'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { LABEL, linkOf, loadNotifications } from '../lib/notifications';
import Emoji from './Emoji';
import EmojiText, { clip } from './EmojiText';

// 右側に出す、最近の通知（5件）
export default function SideNotifications({ userId }) {
  const [items, setItems] = useState(null);

  const load = useCallback(async () => {
    const { items } = await loadNotifications(userId, 5);
    setItems(items);
  }, [userId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('side-notif-' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  return (
    <section className="panel side-panel">
      <h2>最近の通知</h2>
      {items === null ? (
        <p className="handle">読み込み中…</p>
      ) : items.length === 0 ? (
        <p className="handle">まだ通知はありません。</p>
      ) : (
        <ul className="side-notif-list">
          {items.map((n) => {
            const href = linkOf(n);
            const name = n.actor?.display_name || n.actor?.handle || '不明なユーザー';
            const body = (
              <>
                <span>
                  <strong>
                    <EmojiText text={name} />
                  </strong>
                  {LABEL[n.type]}
                  {n.type === 'reaction' && n.emoji && (
                    <>
                      {' '}
                      <Emoji char={n.emoji} />
                    </>
                  )}
                </span>
                {n.shown && (
                  <span className="side-notif-snippet">
                    {n.shown.text ? <EmojiText text={clip(n.shown.text, 40)} /> : '（添付のみの投稿）'}
                  </span>
                )}
              </>
            );
            return (
              <li key={n.id} className={n.is_read ? '' : 'unread'}>
                {href ? <Link href={href}>{body}</Link> : <div>{body}</div>}
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/notifications" className="back">すべて見る →</Link>
    </section>
  );
}
