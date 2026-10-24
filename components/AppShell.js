'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase, safeUrl } from '../lib/supabase';
import { useSession } from '../lib/useSession';
import { useUnread } from '../lib/useUnread';
import Emoji from './Emoji';
import EmojiText, { initialOf } from './EmojiText';
import SideNotifications from './SideNotifications';

// 全ページ共通の枠：左にメニュー、真ん中に本体、右に最近の通知（画面が広いとき）
export default function AppShell({ children }) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const pathname = usePathname() ?? '/';
  const unread = useUnread(userId);
  const [me, setMe] = useState(null);

  useEffect(() => {
    if (!userId) {
      setMe(null);
      return;
    }
    let alive = true;
    const load = () =>
      supabase
        .from('profiles')
        .select('handle, display_name, avatar_url')
        .eq('id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (alive) setMe(data);
        });
    load();
    window.addEventListener('profile-updated', load);
    return () => {
      alive = false;
      window.removeEventListener('profile-updated', load);
    };
  }, [userId]);

  const profileHref = me?.handle ? `/u/${me.handle}` : null;
  const avatar = safeUrl(me?.avatar_url || '');
  const cls = (active) => 'nav-item' + (active ? ' active' : '');

  return (
    <div className="app">
      <aside className="side-left">
        <nav className="nav" aria-label="メインメニュー">
          <Link href="/" className="nav-brand">カヤジュッドサイト</Link>

          <Link href="/" className={cls(pathname === '/')} aria-label="ホーム">
            <Emoji char="🏠" />
            <span className="nav-label">ホーム</span>
          </Link>

          {userId && (
            <Link
              href="/notifications"
              className={cls(pathname === '/notifications')}
              aria-label={unread > 0 ? `通知（未読${unread}件）` : '通知'}
            >
              <Emoji char="🔔" />
              <span className="nav-label">通知</span>
              {unread > 0 && (
                <span key={unread} className="badge">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
          )}

          {profileHref && (
            <Link href={profileHref} className={cls(pathname === profileHref)} aria-label="プロフィール">
              <Emoji char="👤" />
              <span className="nav-label">プロフィール</span>
            </Link>
          )}

          {me && profileHref && (
            <div className="nav-me">
              <Link href={profileHref} className="nav-me-card" aria-label="自分のプロフィール">
                <div className="avatar">
                  {avatar ? (
                    <img src={avatar} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span>
                      <EmojiText text={initialOf(me.display_name || me.handle)} />
                    </span>
                  )}
                </div>
                <div className="nav-me-text">
                  <strong>
                    <EmojiText text={me.display_name || me.handle} />
                  </strong>
                  <span className="handle">@{me.handle}</span>
                </div>
              </Link>
              <button type="button" className="quiet nav-logout" onClick={() => supabase.auth.signOut()}>
                ログアウト
              </button>
            </div>
          )}
        </nav>
      </aside>

      <main className="main">{children}</main>

      <aside className="side-right">
        {userId && pathname !== '/notifications' && <SideNotifications userId={userId} />}
      </aside>
    </div>
  );
}
