'use client';

import { useState } from 'react';
import Attachment, { kindOf } from './Attachment';
import { safeUrl } from '../lib/supabase';

const MAX_TILES = 4; // 画像・動画は最大4マス（5件以上は「＋N」にまとめる）
const MAX_LIST = 3; // 音声・ファイルは最大3件まで

export default function Attachments({ urls }) {
  const [expanded, setExpanded] = useState(false);

  const items = (urls ?? [])
    .map(safeUrl)
    .filter(Boolean)
    .map((href) => ({ href, kind: kindOf(href) }));
  if (items.length === 0) return null;

  const visuals = items.filter((i) => i.kind === 'image' || i.kind === 'video');
  const others = items.filter((i) => i.kind === 'audio' || i.kind === 'file');

  const hiddenVisuals = !expanded && visuals.length > MAX_TILES ? visuals.length - (MAX_TILES - 1) : 0;
  const shownVisuals = hiddenVisuals ? visuals.slice(0, MAX_TILES - 1) : visuals;
  const hiddenOthers = !expanded && others.length > MAX_LIST ? others.length - MAX_LIST : 0;
  const shownOthers = hiddenOthers ? others.slice(0, MAX_LIST) : others;
  const tileCount = shownVisuals.length + (hiddenVisuals ? 1 : 0);
  const canCollapse = expanded && (visuals.length > MAX_TILES || others.length > MAX_LIST);

  return (
    <>
      {tileCount > 0 && (
        <div className={`gallery n${Math.min(tileCount, 4)}`}>
          {shownVisuals.map((v, i) =>
            v.kind === 'image' ? (
              <a key={i} className="cell" href={v.href} target="_blank" rel="noopener noreferrer">
                <img src={v.href} alt="" loading="lazy" referrerPolicy="no-referrer" />
              </a>
            ) : (
              <div key={i} className="cell">
                <video src={v.href} controls preload="metadata" />
              </div>
            )
          )}
          {hiddenVisuals > 0 && (
            <button
              type="button"
              className="cell more-tile"
              aria-label={`残り${hiddenVisuals}件の添付を表示`}
              onClick={() => setExpanded(true)}
            >
              ＋{hiddenVisuals}
            </button>
          )}
        </div>
      )}

      {shownOthers.length > 0 && (
        <div className="attach-list">
          {shownOthers.map((o, i) => (
            <Attachment key={i} url={o.href} />
          ))}
        </div>
      )}
      {hiddenOthers > 0 && (
        <button type="button" className="linkbtn-block" onClick={() => setExpanded(true)}>
          他{hiddenOthers}件の添付を表示
        </button>
      )}
      {canCollapse && (
        <button type="button" className="linkbtn-block" onClick={() => setExpanded(false)}>
          添付を折りたたむ
        </button>
      )}
    </>
  );
}
