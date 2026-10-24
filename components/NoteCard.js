'use client';

import { useState } from 'react';
import Attachment from './Attachment';
import Emoji from './Emoji';
import ReactionBar from './ReactionBar';
import { supabase, safeUrl } from '../lib/supabase';

const nameOf = (p) => p?.display_name || p?.handle || '不明なユーザー';
const snippet = (n) =>
  n?.text ? (n.text.length > 80 ? n.text.slice(0, 80) + '…' : n.text) : '（添付のみの投稿）';

function Avatar({ profile }) {
  const src = safeUrl(profile?.avatar_url || '');
  return (
    <div className="avatar">
      {src ? (
        <img src={src} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span>{nameOf(profile).slice(0, 1)}</span>
      )}
    </div>
  );
}

function NoteView({ note, byId, reactionsMap, userId, onChange, onReply, onQuote }) {
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState('');
  const p = note.profiles;
  const parent = note.reply_to ? byId[note.reply_to] : null;
  const quoted = note.renote_of ? byId[note.renote_of] : null;

  async function renote() {
    setMenu(false);
    setError('');
    const { error } = await supabase
      .from('notes')
      .insert({ user_id: userId, text: '', renote_of: note.id });
    if (error) setError('リノートできませんでした：' + error.message);
    onChange();
  }

  return (
    <article className="note">
      <Avatar profile={p} />
      <div className="body">
        {note.reply_to && (
          <p className="reply-label">
            ↩ {parent ? `@${parent.profiles?.handle} への返信：${snippet(parent)}` : '返信'}
          </p>
        )}
        <div className="meta">
          <strong>{nameOf(p)}</strong>
          <span className="handle">@{p?.handle}</span>
          <time>{new Date(note.created_at).toLocaleString('ja-JP')}</time>
        </div>
        {note.text && <p className="text">{note.text}</p>}
        {note.file_urls?.map((u, i) => <Attachment key={i} url={u} />)}

        {note.renote_of && (
          <div className="quote">
            {quoted ? (
              <>
                <div className="meta">
                  <strong>{nameOf(quoted.profiles)}</strong>
                  <span className="handle">@{quoted.profiles?.handle}</span>
                </div>
                {quoted.text && <p className="text">{quoted.text}</p>}
                {quoted.file_urls?.map((u, i) => <Attachment key={i} url={u} />)}
              </>
            ) : (
              <p className="handle">引用元の投稿は表示できません。</p>
            )}
          </div>
        )}

        <ReactionBar
          noteId={note.id}
          reactions={reactionsMap[note.id] ?? []}
          userId={userId}
          onChange={onChange}
        />

        {userId && (
          <div className="actions">
            <button type="button" className="chip" aria-label="返信" onClick={() => onReply(note)}>
              <Emoji char="💬" /> 返信
            </button>
            <div className="menu-wrap">
              <button
                type="button"
                className="chip"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                <Emoji char="🔁" /> リノート
              </button>
              {menu && (
                <div className="menu" role="menu">
                  <button type="button" onClick={renote}>リノート</button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      onQuote(note);
                    }}
                  >
                    引用
                  </button>
                </div>
              )}
            </div>
            {error && <span className="notice">{error}</span>}
          </div>
        )}
      </div>
    </article>
  );
}

export default function NoteCard({ note, ...rest }) {
  const isPureRenote = note.renote_of && !note.text && !(note.file_urls?.length > 0);

  if (isPureRenote) {
    const original = rest.byId[note.renote_of];
    return (
      <div className="renote-wrap">
        <p className="renote-label">
          <Emoji char="🔁" /> {nameOf(note.profiles)} がリノート
        </p>
        {original ? (
          <NoteView note={original} {...rest} />
        ) : (
          <p className="empty">元の投稿は表示できません。</p>
        )}
      </div>
    );
  }
  return <NoteView note={note} {...rest} />;
}
