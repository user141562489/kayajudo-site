'use client';

import { useState } from 'react';
import { useSession } from '../lib/useSession';
import Auth from '../components/Auth';
import Composer from '../components/Composer';
import Timeline from '../components/Timeline';

export default function Home() {
  const { session, ready } = useSession();
  const [target, setTarget] = useState(null);

  function pick(kind) {
    return (note) => {
      setTarget({ kind, note });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  return (
    <>
      <div className="page-head">
        <h2>ホーム</h2>
      </div>

      {!ready ? null : session ? (
        <Composer userId={session.user.id} target={target} onClearTarget={() => setTarget(null)} />
      ) : (
        <Auth />
      )}

      <Timeline
        userId={session?.user.id ?? null}
        onReply={pick('reply')}
        onQuote={pick('quote')}
      />
    </>
  );
}
