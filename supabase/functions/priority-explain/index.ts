// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getGoogleAccessToken, getGroqApiKey, fetchGmailWithCache } from '../_shared/google.ts'

function decodeBase64Url(input: string): string {
  return atob(input.replace(/-/g, '+').replace(/_/g, '/'))
}

function extractPlainText(payload: any): string {
  if (!payload) return ''
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }
  if (payload.parts?.length) {
    for (const part of payload.parts) {
      const text = extractPlainText(part)
      if (text) return text
    }
  }
  return ''
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })

  try {
    const { userId } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const GROQ_KEY = getGroqApiKey()

    // Get stored Google token (no more browser popup)
    let token: string | null = null
    try {
      token = await getGoogleAccessToken({ supabase, userId })
    } catch (e) {
      console.warn('Could not get Google token, skipping Gmail parsing:', e.message)
    }

    // 1. Import tasks from Gmail (unread) with caching
    if (token) {
      try {
        const gmailData = await fetchGmailWithCache({
          supabase,
          userId,
          token,
          query: 'is:unread',
          maxResults: 5,
          cacheMinutes: 5 // Cache for 5 minutes to prevent rate limiting
        })
        
        const messages = gmailData.messages ?? []

        if (messages.length > 0) {
          const emailTexts = []
          for (const msg of messages.slice(0, 3)) { // Limit to 3 to avoid timeout
            try {
              const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
                headers: { Authorization: `Bearer ${token}` }
              })
              
              if (!msgRes.ok) {
                console.warn(`Failed to fetch message ${msg.id}:`, msgRes.status)
                continue
              }
              
              const msgData = await msgRes.json()
              const headers = msgData.payload?.headers ?? []
              const subject = headers.find((h: any) => h.name === 'Subject')?.value ?? '(No subject)'
              const from = headers.find((h: any) => h.name === 'From')?.value ?? ''
              const body = extractPlainText(msgData.payload).slice(0, 4000)

              const combined = `From: ${from}\nSubject: ${subject}\n\n${body || msgData.snippet || ''}`.trim()
              if (combined) emailTexts.push(combined)
            } catch (msgErr) {
              console.warn(`Error fetching message ${msg.id}:`, msgErr)
            }
          }

          if (emailTexts.length > 0 && GROQ_KEY) {
            // Parse tasks from emails
            const parsePrompt = `You are an AI that extracts tasks from emails based on keywords and deadlines.
Emails: ${JSON.stringify(emailTexts)}
Extract any actionable tasks. Pay special attention to deadlines or urgent keywords. Return ONLY a valid JSON array:
[{"title": "short title", "description": "...", "ai_difficulty": "easy" | "medium" | "hard", "ai_priority_score": 1-100 (higher if urgent/deadline)}]`

            try {
              const parseRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: 'llama-3.1-8b-instant',
                  messages: [{ role: 'user', content: parsePrompt }],
                  temperature: 0.2, max_tokens: 800
                })
              })
              
              if (parseRes.ok) {
                const parseJson = await parseRes.json()
                const parsedStr = parseJson.choices[0].message.content.replace(/```json?/gi, '').replace(/```/g, '').trim()
                const extractedTasks = JSON.parse(parsedStr)

                // Insert into Supabase
                const rows = extractedTasks.map((t: any) => ({
                  user_id: userId,
                  title: (t.title || 'Gmail Task').slice(0, 180),
                  description: (t.description || '').slice(0, 2000),
                  ai_difficulty: t.ai_difficulty || 'medium',
                  ai_priority_score: t.ai_priority_score || 50,
                  ai_source: 'priority_engine',
                  ai_generated: true,
                  status: 'todo'
                }))
                
                if (rows.length > 0) {
                  // Avoid duplicates
                  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                  const titles = rows.map((r: any) => r.title)
                  const { data: existing } = await supabase
                    .from('tasks')
                    .select('title')
                    .eq('user_id', userId)
                    .eq('ai_source', 'priority_engine')
                    .in('title', titles)
                    .gte('created_at', cutoff)

                  const existingSet = new Set((existing ?? []).map((e: any) => e.title))
                  const toInsert = rows.filter((r: any) => !existingSet.has(r.title))
                  if (toInsert.length > 0) {
                    await supabase.from('tasks').insert(toInsert)
                  }
                }
              }
            } catch (aiErr) {
              console.warn('AI parsing failed:', aiErr)
            }
          }
        }
      } catch (gmailErr) {
        console.warn("Failed to fetch Gmail:", gmailErr)
      }
    }

    // 2. Query all incomplete tasks
    const { data: dbTasks } = await supabase.from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'todo')
      .order('ai_priority_score', { ascending: false })

    const topTasks = (dbTasks ?? []).slice(0, 5)

    // 3. Generate AI Explanation
    let explanation = "Focus on the top priority task first."
    if (topTasks.length > 0 && GROQ_KEY) {
      const prompt = `You are a productivity coach ranking tasks by priority score.
Ranked tasks: ${JSON.stringify(topTasks.map((t: any) => ({ name: t.title || t.description, score: t.ai_priority_score ?? t.priority_score ?? 0 })))}
Explain in 2-3 sentences why this order makes sense.
Suggest which task to start RIGHT NOW. Be direct and encouraging.`

      try {
        const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4, max_tokens: 800
          })
        })
        
        if (aiRes.ok) {
          const json = await aiRes.json()
          explanation = json.choices[0].message.content
        }
      } catch (aiErr) {
        console.warn('AI explanation failed:', aiErr)
      }
    }

    return new Response(JSON.stringify({ explanation, tasks: dbTasks }), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error('Priority explain error:', err)
    const isAuthError = err.message?.includes('NO_REFRESH_TOKEN') || err.message?.includes('refresh token') || err.message?.includes('invalid_grant')
    const status = isAuthError ? 401 : 500
    return new Response(JSON.stringify({ error: err.message, needsReauth: isAuthError }), {
      status,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  }
})
