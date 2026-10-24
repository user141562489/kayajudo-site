'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Auth from '../components/Auth';
import Composer from '../components/Composer';
import ProfileEditor from '../components/ProfileEditor';
import Timeline from '../components/Timeline';

export default function Home() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="shell">
      <header className="top">
        <h1>カヤジュッドサイト</h1>
        {session && (
          <div className="row">
            <button className="quiet" onClick={() => setEditing(!editing)}>
              プロフィール編集
            </button>
            <button className="quiet" onClick={() => supabase.auth.signOut()}>
              ログアウト
            </button>
          </div>
        )}
      </header>

      {!ready ? null : session ? (
        <>
          {editing && (
            <ProfileEditor
              userId={session.user.id}
              onClose={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                setVersion((v) => v + 1);
              }}
            />
          )}
          <Composer userId={session.user.id} />
        </>
      ) : (
        <Auth />
      )}

      <Timeline key={version} />
    </div>
  );
}
