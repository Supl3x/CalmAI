// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getGoogleAccessToken } from '../_shared/google.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })

  try {
    const { userId, googleToken } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const today = new Date().toISOString().split('T')[0]
    // 1. Fetch user's tasks from DB
    const { data: tasks } = await supabase.from('tasks')
      .select('title, description, ai_priority_score').eq('user_id', userId).eq('status', 'todo')
      .order('ai_priority_score', { ascending: false }).limit(5)

    // 2. Fetch open loop count
    const { count: loopCount } = await supabase.from('open_loops')
      .select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'open')

    // 2.5 Fetch yesterday's analytics
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const { data: yesterdayStats } = await supabase.from('analytics').select('tasks_completed, focus_minutes').eq('user_id', userId).eq('week_start', yesterdayStr).single()

    // 3. Fetch today's calendar events (ONLY Calendar; no Gmail/Drive here)
    let calendarEvents: any[] = []
    try {
      // Use browser-provided GIS token first, fall back to stored token
      const token = googleToken ?? await getGoogleAccessToken({ supabase, userId })

      const now = new Date()
      const dayEnd = new Date(now)
      dayEnd.setHours(23, 59, 59, 0)

      const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${dayEnd.toISOString()}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const calData = await calRes.json()

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

    // 4. Deterministic "briefing" content: calendar is the only external dependency.
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
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } })
  }
})
