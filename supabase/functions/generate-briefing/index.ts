// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getGoogleAccessToken, fetchCalendarWithCache } from '../_shared/google.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })

  try {
    const { userId } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const today = new Date().toISOString().split('T')[0]
    
    // 1. Fetch user's tasks from DB
    const { data: tasks } = await supabase.from('tasks')
      .select('title, description, ai_priority_score').eq('user_id', userId).eq('status', 'todo')
      .order('ai_priority_score', { ascending: false}).limit(5)

    // 2. Fetch open loop count
    const { count: loopCount } = await supabase.from('open_loops')
      .select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'open')

    // 3. Fetch yesterday's analytics
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const { data: yesterdayStats } = await supabase.from('analytics').select('tasks_completed, focus_minutes').eq('user_id', userId).eq('week_start', yesterdayStr).single()

    // 4. Fetch today's calendar events with caching
    let calendarEvents: any[] = []
    try {
      const token = await getGoogleAccessToken({ supabase, userId })

      const now = new Date()
      const dayEnd = new Date(now)
      dayEnd.setHours(23, 59, 59, 0)

      const calData = await fetchCalendarWithCache({
        supabase,
        userId,
        token,
        timeMin: now.toISOString(),
        timeMax: dayEnd.toISOString(),
        cacheMinutes: 10 // Cache for 10 minutes
      })

      calendarEvents = (calData.items ?? []).map((e: any) => ({
        id: e.id,
        name: e.summary ?? 'Untitled',
        time: e.start?.dateTime
          ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : 'All day',
        start: e.start?.dateTime ?? e.start?.date,
        end: e.end?.dateTime ?? e.end?.date,
        description: e.description ?? '',
        location: e.location ?? '',
        meetLink: e.hangoutLink ?? e.conferenceData?.entryPoints?.find((p: any) => p.entryPointType === 'video')?.uri ?? '',
        attendees: (e.attendees ?? []).filter((a: any) => !a.resource).map((a: any) => ({ email: a.email, responseStatus: a.responseStatus })),
      }))
    } catch (e: any) {
      console.warn('Google Calendar unavailable, using task data only:', e.message)
    }

    // 5. Build briefing content
    const overload = (calendarEvents?.length ?? 0) >= 3 || (tasks?.length ?? 0) >= 8
    const content: any = {
      top_3_priorities: (tasks ?? []).map((t: any) => t.title || t.description).slice(0, 3),
      suggested_schedule: (calendarEvents ?? []).map((e: any) => ({ time: e.time, activity: e.name })),
      cognitive_overload_warning: {
        is_overloaded: overload,
        message: overload ? 'Your day is packed. Protect 1 deep-work block and say no to one optional thing.' : null
      },
      motivational_insight: 'One calm block of progress beats frantic multitasking.',
      calendar_events: calendarEvents ?? [],
      unread_emails: 0,
      open_loops: loopCount ?? 0,
      yesterday: yesterdayStats ?? { tasks_completed: 0, focus_minutes: 0 },
    }

    // 6. Save to daily_briefings
    await supabase.from('daily_briefings').upsert({
      user_id: userId,
      briefing_date: today,
      content,
    }, { onConflict: 'user_id,briefing_date' })

    return new Response(JSON.stringify({ content }), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error('Generate briefing error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } })
  }
})
