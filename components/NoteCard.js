import Attachment from './Attachment';
import ReactionBar from './ReactionBar';
import { safeUrl } from '../lib/supabase';

export default function NoteCard({ note, reactions, userId, onChange }) {
  const p = note.profiles;
  const avatar = safeUrl(p?.avatar_url || '');
  return (
    <article className="note">
      <div className="avatar">
        {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : <span>{(p?.display_name || '?').slice(0, 1)}</span>}
      </div>
      <div className="body">
        <div className="meta">
          <strong>{p?.display_name || p?.handle}</strong>
          <span className="handle">@{p?.handle}</span>
          <time>{new Date(note.created_at).toLocaleString('ja-JP')}</time>
        </div>
        {note.text && <p className="text">{note.text}</p>}
        {note.file_urls?.map((u, i) => <Attachment key={i} url={u} />)}
        <ReactionBar noteId={note.id} reactions={reactions} userId={userId} onChange={onChange} />
      </div>
    </article>
  );
}
