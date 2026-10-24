'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, safeUrl } from '../../../lib/supabase';
import { useSession } from '../../../lib/useSession';
import EmojiText, { initialOf } from '../../../components/EmojiText';
import FollowBar from '../../../components/FollowBar';
import ProfileEditor from '../../../components/ProfileEditor';
import Timeline from '../../../components/Timeline';

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
    <>
      <div className="page-head">
        <h2>プロフィール</h2>
      </div>

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
                <span>
                  <EmojiText text={initialOf(profile.display_name || profile.handle)} />
                </span>
              )}
            </div>
          </div>

          <div className="profile-info">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h2>
                  <EmojiText text={profile.display_name || profile.handle} />
                </h2>
                <span className="handle">@{profile.handle}</span>
              </div>
              {isMe && (
                <div className="row">
                  <button className="quiet" onClick={() => setEditing(!editing)}>
                    プロフィールを編集
                  </button>
                  <button className="quiet" onClick={() => supabase.auth.signOut()}>
                    ログアウト
                  </button>
                </div>
              )}
            </div>
            {profile.bio && (
              <p className="profile-bio">
                <EmojiText text={profile.bio} />
              </p>
            )}
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
    </>
  );
}
