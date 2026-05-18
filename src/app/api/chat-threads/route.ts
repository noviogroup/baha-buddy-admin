import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET /api/chat-threads?user_id=xxx — list threads for a user
// GET /api/chat-threads?thread_id=xxx — get messages for a thread
// GET /api/chat-threads — recent threads across all users (default)
export const GET = withAdminAuth(async (request, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const threadId = searchParams.get('thread_id');

    if (threadId) {
      // Get messages for a specific thread
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;

      // Get thread metadata
      const { data: thread } = await supabase
        .from('chat_threads')
        .select('*, users!inner(display_name, email), trips(name, status)')
        .eq('id', threadId)
        .single();

      return NextResponse.json({
        thread: thread || null,
        messages: messages || [],
      });
    }

    if (userId) {
      // List all threads for a user
      const { data: threads, error } = await supabase
        .from('chat_threads')
        .select('*, trips(name, status)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return NextResponse.json({ threads: threads || [] });
    }

    // List recent threads across all users
    const { data: threads, error } = await supabase
      .from('chat_threads')
      .select('*, users!inner(display_name, email), trips(name, status)')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ threads: threads || [] });
  } catch (err: any) {
    console.error('Chat threads API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
