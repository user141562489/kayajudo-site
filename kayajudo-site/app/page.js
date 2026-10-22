'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Auth from '../components/Auth';
import Composer from '../components/Composer';
import Timeline from '../components/Timeline';

export default function Home() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

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
          <button className="quiet" onClick={() => supabase.auth.signOut()}>
            ログアウト
          </button>
        )}
      </header>

      {!ready ? null : session ? (
        <Composer userId={session.user.id} />
      ) : (
        <Auth />
      )}

      <Timeline />
    </div>
  );
}
