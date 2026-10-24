'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, safeUrl } from '../lib/supabase';

function FollowList({ profileId, kind, rev, onClose }) {
  const [people, setPeople] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      // フォロー中の一覧 = この人がフォローしている相手 / フォロワーの一覧 = この人をフォローしている相手
      const mine = kind === 'following' ? 'follower_id' : 'followee_id';
      const other = kind === 'following' ? 'followee_id' : 'follower_id';

      const { data: rows, error: e1 } = await supabase
        .from('follows')
        .select(`${other}, created_at`)
        .eq(mine, profileId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!alive) return;
      if (e1) {
        setError('一覧を読み込めませんでした：' + e1.message);
        setPeople([]);
        return;
      }

      const ids = rows.map((r) => r[other]);
      if (ids.length === 0) {
        setPeople([]);
        return;
      }
      const { data: profs, error: e2 } = await supabase
        .from('profiles')
        .select('id, handle, display_name, bio, avatar_url')
        .in('id', ids);
      if (!alive) return;
      if (e2) setError('プロフィールを読み込めませんでした：' + e2.message);
      const byId = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      setPeople(ids.map((id) => byId[id]).filter(Boolean));
    })();
    return () => {
      alive = false;
    };
  }, [profileId, kind, rev]);

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{kind === 'following' ? 'フォロー中' : 'フォロワー'}</h2>
        <button type="button" className="quiet" onClick={onClose}>閉じる</button>
      </div>
      {error && <p className="notice">{error}</p>}
      {people === null ? (
        <p className="empty">読み込み中…</p>
      ) : people.length === 0 ? (
        <p className="empty">まだ誰もいません。</p>
      ) : (
        <div className="person-list">
          {people.map((p) => {
            const avatar = safeUrl(p.avatar_url || '');
            return (
              <Link key={p.id} href={`/u/${p.handle}`} className="person">
                <div className="avatar">
                  {avatar ? (
                    <img src={avatar} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span>{(p.display_name || p.handle).slice(0, 1)}</span>
                  )}
                </div>
                <div className="person-info">
                  <strong>{p.display_name || p.handle}</strong>
                  <span className="handle">@{p.handle}</span>
                  {p.bio && <span className="person-bio">{p.bio}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FollowBar({ profile, viewerId }) {
  const [counts, setCounts] = useState({ following: 0, followers: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [open, setOpen] = useState(null); // 'following' | 'followers' | null
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rev, setRev] = useState(0);
  const isMe = viewerId === profile.id;

  const refresh = useCallback(async () => {
    const none = { data: null };
    const [a, b, c] = await Promise.all([
      supabase.from('follows').select('followee_id', { count: 'exact', head: true }).eq('follower_id', profile.id),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', profile.id),
      viewerId && !isMe
        ? supabase
            .from('follows')
            .select('follower_id')
            .eq('follower_id', viewerId)
            .eq('followee_id', profile.id)
            .maybeSingle()
        : none,
    ]);
    setCounts({ following: a.count ?? 0, followers: b.count ?? 0 });
    setIsFollowing(!!c.data);
    setRev((v) => v + 1);
  }, [profile.id, viewerId, isMe]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggle() {
    setBusy(true);
    setError('');
    const { error } = isFollowing
      ? await supabase.from('follows').delete().match({ follower_id: viewerId, followee_id: profile.id })
      : await supabase.from('follows').insert({ follower_id: viewerId, followee_id: profile.id });
    setBusy(false);
    if (error) setError('操作できませんでした：' + error.message);
    refresh();
  }

  const toggleList = (kind) => setOpen(open === kind ? null : kind);

  return (
    <div className="follow-bar">
      <div className="row">
        <button
          type="button"
          className="count-btn"
          aria-expanded={open === 'following'}
          onClick={() => toggleList('following')}
        >
          <strong>{counts.following}</strong> フォロー中
        </button>
        <button
          type="button"
          className="count-btn"
          aria-expanded={open === 'followers'}
          onClick={() => toggleList('followers')}
        >
          <strong>{counts.followers}</strong> フォロワー
        </button>

        {viewerId && !isMe && (
          <button
            type="button"
            className={isFollowing ? 'quiet' : ''}
            aria-pressed={isFollowing}
            disabled={busy}
            onClick={toggle}
          >
            {isFollowing ? 'フォロー中' : 'フォローする'}
          </button>
        )}
        {!viewerId && <span className="handle">ログインするとフォローできます</span>}
      </div>

      {error && <p className="notice">{error}</p>}
      {open && <FollowList key={open} profileId={profile.id} kind={open} rev={rev} onClose={() => setOpen(null)} />}
    </div>
  );
}
