import { supabase } from './supabase';

export const LABEL = {
  reaction: 'があなたの投稿にリアクションしました',
  renote: 'があなたの投稿をリノートしました',
  quote: 'があなたの投稿を引用しました',
  reply: 'があなたに返信しました',
  mention: 'があなたをメンションしました',
  follow: 'があなたをフォローしました',
};

// 通知を押したときの移動先
export function linkOf(n) {
  if (n.type === 'follow') return n.actor?.handle ? `/u/${n.actor.handle}` : null;
  const id = n.type === 'renote' ? n.target_note_id : n.note_id;
  return id ? `/n/${id}` : null;
}

// 通知と、関連するユーザー・投稿をまとめて読み込む
export async function loadNotifications(userId, limit = 50) {
  const { data: rows, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { items: [], error: '通知を読み込めませんでした：' + error.message };

  const actorIds = [...new Set(rows.map((r) => r.actor_id))];
  const noteIds = [...new Set(rows.flatMap((r) => [r.note_id, r.target_note_id]).filter(Boolean))];
  const empty = { data: [], error: null };
  const [pRes, nRes] = await Promise.all([
    actorIds.length
      ? supabase.from('profiles').select('id, handle, display_name, avatar_url').in('id', actorIds)
      : empty,
    noteIds.length ? supabase.from('notes').select('id, text, file_urls').in('id', noteIds) : empty,
  ]);
  const profById = Object.fromEntries((pRes.data ?? []).map((p) => [p.id, p]));
  const noteById = Object.fromEntries((nRes.data ?? []).map((n) => [n.id, n]));

  const items = rows.map((r) => ({
    ...r,
    actor: profById[r.actor_id] ?? null,
    // リアクション・リノートは「自分の投稿」、それ以外は「相手の投稿」の内容を見せる
    shown:
      r.type === 'follow' ? null : noteById[r.type === 'renote' ? r.target_note_id : r.note_id] ?? null,
  }));
  return { items, error: '' };
}
