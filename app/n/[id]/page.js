'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '../../../lib/useSession';
import Composer from '../../../components/Composer';
import Timeline from '../../../components/Timeline';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function NotePage() {
  const { id } = useParams();
  const router = useRouter();
  const { session } = useSession();
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
        <button type="button" className="quiet" onClick={() => router.back()}>← 戻る</button>
        <h2>投稿</h2>
      </div>

      {!UUID.test(id) ? (
        <p className="empty">投稿が見つかりません。</p>
      ) : (
        <>
          {session && target && (
            <Composer userId={session.user.id} target={target} onClearTarget={() => setTarget(null)} />
          )}
          <Timeline
            focusId={id}
            userId={session?.user.id ?? null}
            onReply={pick('reply')}
            onQuote={pick('quote')}
            emptyText="投稿が見つかりません（削除されたかもしれません）。"
          />
        </>
      )}
    </>
  );
}
