// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getGoogleAccessToken } from '../_shared/google.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })

  try {
    const { userId } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const token = await getGoogleAccessToken({ supabase, userId })

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const now = new Date()

    // Run all three Google API calls in parallel
    const [gmailSentRes, calendarRes, driveRes] = await Promise.all([
      // Emails sent this week
      fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:sent after:${Math.floor(sevenDaysAgo.getTime() / 1000)}&maxResults=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      // Calendar events this week
      fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${sevenDaysAgo.toISOString()}&timeMax=${now.toISOString()}&singleEvents=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      // Drive files modified this week
      fetch(
        `https://www.googleapis.com/drive/v3/files?q=modifiedTime>'${sevenDaysAgo.toISOString()}'&fields=files(id,name,modifiedTime)&pageSize=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
    ])

    const [gmailData, calData, driveData] = await Promise.all([
      gmailSentRes.json(),
      calendarRes.json(),
      driveRes.json()
    ])

    const stats = {
      emailsSent: gmailData.resultSizeEstimate ?? 0,
      meetingsAttended: (calData.items ?? []).length,
      driveDocsModified: (driveData.files ?? []).length,
    }

    return new Response(JSON.stringify(stats), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } })
  }
})
