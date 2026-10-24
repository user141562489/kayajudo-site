'use client';

import { useState } from 'react';
import Link from 'next/link';
import Attachments from './Attachments';
import Emoji from './Emoji';
import EmojiText, { clip, initialOf } from './EmojiText';
import ReactionBar from './ReactionBar';
import RichText from './RichText';
import { supabase, safeUrl } from '../lib/supabase';

const nameOf = (p) => p?.display_name || p?.handle || '不明なユーザー';
const snippet = (n) => (n?.text ? clip(n.text, 80) : '（添付のみの投稿）');

function Avatar({ profile }) {
  const src = safeUrl(profile?.avatar_url || '');
  const inner = (
    <div className="avatar">
      {src ? (
        <img src={src} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span>
          <EmojiText text={initialOf(nameOf(profile))} />
        </span>
      )}
    </div>
  );
  return profile?.handle ? (
    <Link href={`/u/${profile.handle}`} aria-label={`${nameOf(profile)}のプロフィール`}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

function NameLink({ profile }) {
  const name = (
    <strong>
      <EmojiText text={nameOf(profile)} />
    </strong>
  );
  return profile?.handle ? (
    <Link href={`/u/${profile.handle}`} className="plain">
      {name}
    </Link>
  ) : (
    name
  );
}

// 長い本文は6行まででたたみ、「もっと見る」で開く
function Body({ text, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const long = text.length > 240 || text.split('\n').length > 6;
  return (
    <>
      <p className={'text' + (long && !open ? ' clamped' : '')}>
        <RichText text={text} />
      </p>
      {long && (
        <button type="button" className="linkbtn-block" onClick={() => setOpen(!open)}>
          {open ? '閉じる' : 'もっと見る'}
        </button>
      )}
    </>
  );
}

function NoteView({ note, byId, reactionsMap, myRenotes = {}, focusId, userId, onChange, onReply, onQuote }) {
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState('');
  const p = note.profiles;
  const parent = note.reply_to ? byId[note.reply_to] : null;
  const quoted = note.renote_of ? byId[note.renote_of] : null;
  const myRenoteId = myRenotes[note.id];
  const isMine = userId && note.user_id === userId;
  const isFocus = note.id === focusId;

  async function toggleRenote() {
    setMenu(false);
    setError('');
    const { error } = myRenoteId
      ? await supabase.from('notes').delete().eq('id', myRenoteId)
      : await supabase.from('notes').insert({ user_id: userId, text: '', renote_of: note.id });
    if (error) setError('リノートの操作ができませんでした：' + error.message);
    onChange();
  }

  async function remove() {
    if (!window.confirm('この投稿を削除しますか？\nこの投稿へのリアクションと、リノートも一緒に消えます。')) return;
    setError('');
    const { error } = await supabase.from('notes').delete().eq('id', note.id);
    if (error) setError('削除できませんでした：' + error.message);
    onChange();
  }

  return (
    <article className={'note' + (isFocus ? ' focus' : '')}>
      <Avatar profile={p} />
      <div className="body">
        {note.reply_to && (
          <p className="reply-label">
            {parent ? (
              <Link href={`/n/${parent.id}`} className="plain">
                ↩ @{parent.profiles?.handle} への返信：<EmojiText text={snippet(parent)} />
              </Link>
            ) : (
              '↩ 返信'
            )}
          </p>
        )}
        <div className="meta">
          <NameLink profile={p} />
          <span className="handle">@{p?.handle}</span>
          <Link href={`/n/${note.id}`} className="plain">
            <time>{new Date(note.created_at).toLocaleString('ja-JP')}</time>
          </Link>
        </div>
        {note.text && <Body text={note.text} defaultOpen={isFocus} />}
        <Attachments urls={note.file_urls} />

        {note.renote_of && (
          <div className="quote">
            {quoted ? (
              <>
                <div className="meta">
                  <NameLink profile={quoted.profiles} />
                  <span className="handle">@{quoted.profiles?.handle}</span>
                </div>
                {quoted.text && <Body text={quoted.text} />}
                <Attachments urls={quoted.file_urls} />
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
            {onReply && (
              <button type="button" className="chip" aria-label="返信" onClick={() => onReply(note)}>
                <Emoji char="💬" /> 返信
              </button>
            )}
            <div className="menu-wrap">
              <button
                type="button"
                className={'chip' + (myRenoteId ? ' mine' : '')}
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                <Emoji char="🔁" /> リノート
              </button>
              {menu && (
                <div className="menu" role="menu">
                  <button type="button" onClick={toggleRenote}>
                    {myRenoteId ? 'リノートを取り消す' : 'リノート'}
                  </button>
                  {onQuote && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenu(false);
                        onQuote(note);
                      }}
                    >
                      引用
                    </button>
                  )}
                </div>
              )}
            </div>
            {isMine && (
              <button type="button" className="chip danger" aria-label="削除" onClick={remove}>
                <Emoji char="🗑️" /> 削除
              </button>
            )}
            {error && <span className="notice">{error}</span>}
          </div>
        )}
      </div>
    </article>
  );
}

export default function NoteCard({ note, ...rest }) {
  const [err, setErr] = useState('');
  const isPureRenote = note.renote_of && !note.text && !(note.file_urls?.length > 0);

  async function undo() {
    setErr('');
    const { error } = await supabase.from('notes').delete().eq('id', note.id);
    if (error) setErr('取り消せませんでした：' + error.message);
    rest.onChange();
  }

  if (isPureRenote) {
    const original = rest.byId[note.renote_of];
    const mine = rest.userId && note.user_id === rest.userId;
    return (
      <div className="renote-wrap">
        <p className="renote-label">
          <Emoji char="🔁" /> <EmojiText text={nameOf(note.profiles)} /> がリノート
          {mine && (
            <button type="button" className="linkbtn" onClick={undo}>
              取り消す
            </button>
          )}
          {err && <span className="notice"> {err}</span>}
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
