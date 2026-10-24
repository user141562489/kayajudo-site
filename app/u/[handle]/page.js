'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase, safeUrl } from '../../../lib/supabase';
import { useSession } from '../../../lib/useSession';
import ProfileEditor from '../../../components/ProfileEditor';
import Timeline from '../../../components/Timeline';
import FollowBar from '../../../components/FollowBar';

export default function ProfilePage() {
  const { handle } = useParams();
  const router = useRouter();
  const { session } = useSession();
  const [profile, setProfile] = useState(undefined); // undefined=読み込み中, null=見つからない
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    setProfile(undefined);
    supabase
      .from('profiles')
      .select('id, handle, display_name, bio, avatar_url, header_url, created_at')
      .eq('handle', handle)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError('プロフィールを読み込めませんでした：' + error.message);
        setProfile(data ?? null);
      });
  }, [handle, rev]);

  const isMe = profile && session?.user.id === profile.id;
  const header = safeUrl(profile?.header_url || '');
  const avatar = safeUrl(profile?.avatar_url || '');

  return (
    <div className="shell">
      <header className="top">
        <h1><Link href="/" className="plain">カヤジュッドサイト</Link></h1>
        <Link href="/" className="back">← タイムラインへ</Link>
      </header>

      {profile === undefined && <p className="empty">読み込み中…</p>}

      {profile === null && (
        <p className="empty">{error || `@${handle} というユーザーは見つかりませんでした。`}</p>
      )}

      {profile && (
        <>
          <div className="hero">
            <div className="profile-header">
              {header && <img src={header} alt="" referrerPolicy="no-referrer" />}
            </div>
            <div className="avatar large">
              {avatar ? (
                <img src={avatar} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span>{(profile.display_name || profile.handle).slice(0, 1)}</span>
              )}
            </div>
          </div>

          <div className="profile-info">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h2>{profile.display_name || profile.handle}</h2>
                <span className="handle">@{profile.handle}</span>
              </div>
              {isMe && (
                <button className="quiet" onClick={() => setEditing(!editing)}>
                  プロフィールを編集
                </button>
              )}
            </div>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            <p className="profile-since">
              {new Date(profile.created_at).toLocaleDateString('ja-JP')} に参加
            </p>
            <FollowBar profile={profile} viewerId={session?.user.id ?? null} />
          </div>

          {isMe && editing && (
            <ProfileEditor
              userId={profile.id}
              onClose={() => setEditing(false)}
              onSaved={(newHandle) => {
                setEditing(false);
                if (newHandle && newHandle !== handle) router.replace(`/u/${newHandle}`);
                else setRev((v) => v + 1);
              }}
            />
          )}

          <Timeline
            key={`${profile.id}-${rev}`}
            authorId={profile.id}
            userId={session?.user.id ?? null}
          />
        </>
      )}
    </div>
  );
}
