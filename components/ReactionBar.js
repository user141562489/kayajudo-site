'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PICKER_EMOJIS } from '../lib/emojis';
import Emoji from './Emoji';

export default function ReactionBar({ noteId, reactions, userId, onChange }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  // 絵文字ごとに集計（件数と、自分が付けたかどうか）
  const groups = new Map();
  for (const r of reactions) {
    const g = groups.get(r.emoji) ?? { count: 0, mine: false };
    g.count += 1;
    if (r.user_id === userId) g.mine = true;
    groups.set(r.emoji, g);
  }

  async function toggle(emoji) {
    if (!userId) return;
    setError('');
    const mine = groups.get(emoji)?.mine;
    const { error } = mine
      ? await supabase.from('reactions').delete().match({ note_id: noteId, user_id: userId, emoji })
      : await supabase.from('reactions').insert({ note_id: noteId, user_id: userId, emoji });
    if (error) setError('リアクションできませんでした：' + error.message);
    onChange();
  }

  return (
    <div className="reactions">
      {[...groups.entries()].map(([emoji, g]) => (
        <button
          key={emoji}
          type="button"
          className={'chip' + (g.mine ? ' mine' : '')}
          disabled={!userId}
          onClick={() => toggle(emoji)}
          aria-pressed={g.mine}
        >
          <Emoji char={emoji} />
          <span>{g.count}</span>
        </button>
      ))}

      {userId && (
        <button
          type="button"
          className="chip add"
          aria-label="リアクションを追加"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          ＋
        </button>
      )}

      {open && (
        <div className="picker" role="menu">
          {PICKER_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="pick"
              onClick={() => {
                setOpen(false);
                toggle(emoji);
              }}
            >
              <Emoji char={emoji} />
            </button>
          ))}
        </div>
      )}

      {error && <span className="notice">{error}</span>}
    </div>
  );
}
