'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import Emoji from './Emoji';

export default function NotificationBell({ userId }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setCount(count ?? 0);
  }, [userId]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('bell-' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        refresh
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return (
    <Link
      href="/notifications"
      className="bell"
      aria-label={count > 0 ? `通知（未読${count}件）` : '通知'}
    >
      <Emoji char="🔔" />
      {count > 0 && <span className="badge">{count > 99 ? '99+' : count}</span>}
    </Link>
  );
}
