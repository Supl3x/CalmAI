# CalmFlow AI — Google Integrations README
## Connect Gmail · Google Calendar · Google Drive to All 8 Core Modules

**Stack:** React.js · Supabase · Groq AI · Gemini · Framer Motion  
**Auth:** Google OAuth (already configured via Supabase)  
**This guide:** Wire Gmail, Calendar, and Drive into every core feature

---

## ⚠️ IMPORTANT: Read Before Starting

Your app already uses Google OAuth via Supabase. However, Supabase's OAuth only gives you an **auth token** — it does NOT give you access to Gmail, Calendar, or Drive. You need to request additional OAuth **scopes** so your users grant permission for those APIs.

You will need to:
1. Update your Google Cloud Console OAuth app to request extra scopes
2. Update your Supabase auth call to pass those scopes
3. Store the Google `access_token` and `refresh_token` from the Supabase session
4. Use that token to call Google APIs directly from Edge Functions

---

## STEP 0 — Google Cloud Console Setup

### 0.1 Enable Required APIs

Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Library** and enable:

- **Gmail API**
- **Google Calendar API**
- **Google Drive API**
- **Google People API** (for user profile)

### 0.2 Add OAuth Scopes to Your OAuth Consent Screen

Go to **APIs & Services → OAuth Consent Screen → Edit App → Scopes → Add or Remove Scopes**

Add these scopes:

```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/drive.file
```

> ⚠️ NOTE: If your app is in "Testing" mode on Google Cloud, only test users you add manually can sign in. To go live, submit for Google verification (required when using Gmail/Drive scopes).

---

## STEP 1 — Update Your Supabase Google OAuth Call to Request Scopes

Find your current login button code. It looks like this:

```javascript
// src/components/LoginButton.jsx  ← CURRENT (no scopes)
const handleGoogleLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/auth/callback'
    }
  })
}
```

**Replace it with this:**

```javascript
// src/components/LoginButton.jsx  ← UPDATED (with Google API scopes)
const handleGoogleLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/auth/callback',
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
      ].join(' '),
      queryParams: {
        access_type: 'offline',   // Gets refresh_token
        prompt: 'consent',        // Forces consent screen (needed to get refresh_token every time)
      }
    }
  })
  if (error) showToast('Login failed: ' + error.message, 'error')
}
```

> ⚠️ NOTE: `access_type: 'offline'` and `prompt: 'consent'` are required to receive a `refresh_token`. Without the refresh token, your access expires in 1 hour and you cannot call Google APIs from Edge Functions.

---

## STEP 2 — Extract and Store Google Tokens After Login

### 2.1 Update Your Auth Callback Page

```javascript
// src/pages/AuthCallback.jsx  ← UPDATED
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/login'); return }

      // Extract Google tokens from Supabase session
      const providerToken = session.provider_token         // Google access_token
      const providerRefreshToken = session.provider_refresh_token  // Google refresh_token

      // Save tokens to profiles table so Edge Functions can use them
      if (providerToken) {
        await supabase.from('profiles').update({
          google_access_token: providerToken,
          google_refresh_token: providerRefreshToken,
          google_token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(), // 1hr from now
        }).eq('id', session.user.id)
      }

      // Check onboarding status
      const { data: profile } = await supabase
        .from('profiles').select('onboarding_complete').single()
      navigate(profile?.onboarding_complete ? '/dashboard' : '/onboarding/welcome')
    })
  }, [])

  return <div>Signing you in...</div>
}
```

### 2.2 Add Token Columns to Your Profiles Table

Run this SQL in Supabase → SQL Editor:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_access_token text,
  ADD COLUMN IF NOT EXISTS google_refresh_token text,
  ADD COLUMN IF NOT EXISTS google_token_expiry timestamptz;
```

### 2.3 Create a Token Refresh Edge Function

Because Google access tokens expire in 1 hour, create this utility Edge Function that all other functions call before using Google APIs:

```typescript
// supabase/functions/refresh-google-token/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId } = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: profile } = await supabase
    .from('profiles').select('google_refresh_token, google_token_expiry').eq('id', userId).single()

  if (!profile?.google_refresh_token) {
    return new Response(JSON.stringify({ error: 'No refresh token stored' }), { status: 401 })
  }

  // Check if token is still valid (expires in >5 minutes)
  const expiryTime = new Date(profile.google_token_expiry).getTime()
  if (expiryTime - Date.now() > 5 * 60 * 1000) {
    // Token still valid — fetch and return current token
    const { data: full } = await supabase.from('profiles').select('google_access_token').eq('id', userId).single()
    return new Response(JSON.stringify({ access_token: full?.google_access_token }))
  }

  // Token expired — refresh it
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: profile.google_refresh_token,
      grant_type: 'refresh_token',
    })
  })
  const tokens = await res.json()
  if (!tokens.access_token) {
    return new Response(JSON.stringify({ error: 'Token refresh failed' }), { status: 401 })
  }

  // Save new token
  await supabase.from('profiles').update({
    google_access_token: tokens.access_token,
    google_token_expiry: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
  }).eq('id', userId)

  return new Response(JSON.stringify({ access_token: tokens.access_token }))
})
```

### 2.4 Add Secrets to Supabase Edge Functions

```bash
supabase secrets set GOOGLE_CLIENT_ID=your_google_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Find these in Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client.

---

## STEP 3 — Create a Shared Google API Helper

Create this helper inside every Edge Function that calls Google APIs. Copy-paste it at the top of each function file:

```typescript
// Paste this helper at the top of every Edge Function that uses Google APIs
async function getGoogleToken(userId: string, supabase: any): Promise<string> {
  const refreshRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/refresh-google-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({ userId })
  })
  const { access_token, error } = await refreshRes.json()
  if (error || !access_token) throw new Error('Google auth failed: ' + error)
  return access_token
}
```

---

## MODULE 1 — Micro-Task Decomposer (S-10) + Google Drive

**What changes:** Before the user types a task, offer a "Import from Drive" button. When clicked, it lists their recent Drive documents and lets them select one. The document content is passed into the AI decomposer as additional context.

### 3.1 New Edge Function: `fetch-drive-doc`

```typescript
// supabase/functions/fetch-drive-doc/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId, fileId } = await req.json()
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const token = await getGoogleToken(userId, supabase)

  // Export Google Doc as plain text
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const content = await res.text()

  return new Response(JSON.stringify({ content: content.slice(0, 4000) }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 3.2 New Edge Function: `list-drive-files`

```typescript
// supabase/functions/list-drive-files/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId } = await req.json()
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const token = await getGoogleToken(userId, supabase)

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType,modifiedTime)&q=mimeType='application/vnd.google-apps.document'&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()

  return new Response(JSON.stringify({ files: data.files ?? [] }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 3.3 Frontend Changes — `src/pages/Decomposer.jsx`

```javascript
// Add this button next to the task input textarea
const [driveFiles, setDriveFiles] = useState([])
const [showDrivePicker, setShowDrivePicker] = useState(false)

const loadDriveFiles = async () => {
  const { data } = await supabase.functions.invoke('list-drive-files', { body: { userId: user.id } })
  setDriveFiles(data.files ?? [])
  setShowDrivePicker(true)
}

const importFromDrive = async (fileId) => {
  const { data } = await supabase.functions.invoke('fetch-drive-doc', { body: { userId: user.id, fileId } })
  setTaskInput(prev => prev + '\n\nContext from Drive doc:\n' + data.content)
  setShowDrivePicker(false)
}

// JSX addition inside the Decomposer component:
// <button onClick={loadDriveFiles}>📄 Import from Drive</button>
// {showDrivePicker && driveFiles.map(f => (
//   <button key={f.id} onClick={() => importFromDrive(f.id)}>{f.name}</button>
// ))}
```

---

## MODULE 2 — Open Loop Cleaner (S-11) + Gmail + Calendar

**What changes:** Add two import buttons in the capture bar:
1. **"Import from Gmail"** — pulls subject lines from unread emails as open loops
2. **"Import from Calendar"** — pulls today's/upcoming events as open loops

### 4.1 New Edge Function: `fetch-gmail-threads`

```typescript
// supabase/functions/fetch-gmail-threads/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId, maxResults = 10 } = await req.json()
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const token = await getGoogleToken(userId, supabase)

  // Fetch unread emails
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const { messages = [] } = await listRes.json()

  // Fetch subject line for each message
  const subjects = await Promise.all(messages.map(async (msg: any) => {
    const detail = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await detail.json()
    const headers = data.payload?.headers ?? []
    const subject = headers.find((h: any) => h.name === 'Subject')?.value ?? '(No subject)'
    const from = headers.find((h: any) => h.name === 'From')?.value ?? ''
    return { id: msg.id, subject, from }
  }))

  return new Response(JSON.stringify({ emails: subjects }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 4.2 New Edge Function: `fetch-calendar-events`

```typescript
// supabase/functions/fetch-calendar-events/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId } = await req.json()
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const token = await getGoogleToken(userId, supabase)

  const now = new Date().toISOString()
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${weekEnd}&singleEvents=true&orderBy=startTime&maxResults=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()

  const events = (data.items ?? []).map((e: any) => ({
    id: e.id,
    summary: e.summary ?? 'Untitled Event',
    start: e.start?.dateTime ?? e.start?.date,
    end: e.end?.dateTime ?? e.end?.date,
  }))

  return new Response(JSON.stringify({ events }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 4.3 Frontend Changes — `src/pages/OpenLoopCleaner.jsx`

```javascript
// Add these functions to your Open Loop Cleaner component

const importEmailsAsLoops = async () => {
  setImporting('gmail')
  const { data } = await supabase.functions.invoke('fetch-gmail-threads', {
    body: { userId: user.id, maxResults: 10 }
  })

  const loops = (data.emails ?? []).map(e => ({
    user_id: user.id,
    content: `Reply to email: "${e.subject}" from ${e.from}`,
    category: 'Uncategorised',
    urgency: 'Medium',
  }))

  const { error } = await supabase.from('open_loops').insert(loops)
  if (!error) showToast(`${loops.length} emails imported as open loops`, 'success')
  setImporting(null)
}

const importCalendarAsLoops = async () => {
  setImporting('calendar')
  const { data } = await supabase.functions.invoke('fetch-calendar-events', {
    body: { userId: user.id }
  })

  const loops = (data.events ?? []).map(e => ({
    user_id: user.id,
    content: `Prepare for: "${e.summary}" on ${new Date(e.start).toLocaleDateString()}`,
    category: 'Reminder',
    urgency: 'Medium',
    scheduled_date: e.start?.split('T')[0],
  }))

  const { error } = await supabase.from('open_loops').insert(loops)
  if (!error) showToast(`${loops.length} calendar events imported`, 'success')
  setImporting(null)
}

// Add to JSX capture bar:
// <button onClick={importEmailsAsLoops}>📧 Import from Gmail</button>
// <button onClick={importCalendarAsLoops}>📅 Import from Calendar</button>
```

---

## MODULE 3 — Summary + Timer (S-12) + Gmail + Drive

**What changes:** Users can summarise emails or Drive documents directly — no copy-pasting required.

### 5.1 New Edge Function: `fetch-email-body`

```typescript
// supabase/functions/fetch-email-body/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId, messageId } = await req.json()
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const token = await getGoogleToken(userId, supabase)

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()

  // Extract plain text body
  function extractBody(payload: any): string {
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        const text = extractBody(part)
        if (text) return text
      }
    }
    return ''
  }

  const body = extractBody(data.payload).slice(0, 5000)
  return new Response(JSON.stringify({ body }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 5.2 Frontend Changes — `src/pages/SummaryTimer.jsx`

```javascript
// Add Gmail import button to the text input panel
const [recentEmails, setRecentEmails] = useState([])

const loadEmailsForSummary = async () => {
  const { data } = await supabase.functions.invoke('fetch-gmail-threads', {
    body: { userId: user.id, maxResults: 5 }
  })
  setRecentEmails(data.emails ?? [])
}

const importEmailBody = async (messageId) => {
  const { data } = await supabase.functions.invoke('fetch-email-body', {
    body: { userId: user.id, messageId }
  })
  setInputText(data.body)
  setRecentEmails([])
}

// For Drive docs, reuse the fetch-drive-doc and list-drive-files functions from Module 1:
const importDriveDocForSummary = async (fileId) => {
  const { data } = await supabase.functions.invoke('fetch-drive-doc', {
    body: { userId: user.id, fileId }
  })
  setInputText(data.content)
}

// Add to JSX:
// <button onClick={loadEmailsForSummary}>📧 Pick from Gmail</button>
// <button onClick={loadDriveFiles}>📄 Pick from Drive</button>
```

---

## MODULE 4 — AI Priority Engine (S-13) + Google Calendar

**What changes:** When ranking tasks, also fetch today's Calendar events so the AI can factor in real schedule constraints into its explanation and suggested time blocks.

### 6.1 Update Edge Function: `priority-explain`

Add Calendar fetching to your existing priority-explain function:

```typescript
// Inside your existing priority-explain Edge Function, add before the AI prompt:

const token = await getGoogleToken(userId, supabase)

const now = new Date().toISOString()
const dayEnd = new Date()
dayEnd.setHours(23, 59, 59, 0)

const calRes = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${dayEnd.toISOString()}&singleEvents=true&orderBy=startTime`,
  { headers: { Authorization: `Bearer ${token}` } }
)
const calData = await calRes.json()
const todayEvents = (calData.items ?? []).map((e: any) => ({
  name: e.summary,
  time: e.start?.dateTime ?? e.start?.date
}))

// Then update your AI prompt to include calendar context:
const prompt = `You are a productivity coach ranking tasks by priority score.
Ranked tasks: ${JSON.stringify(tasks.map(t => ({ name: t.description, score: t.priority_score })))}
Today's calendar commitments: ${JSON.stringify(todayEvents)}
Explain in 3-4 sentences why this order makes sense given today's schedule.
Suggest which task to start RIGHT NOW based on the calendar. Be direct and encouraging.`
```

---

## MODULE 5 — AI Daily Briefing (S-14 / S-09) + Gmail + Calendar

**What changes:** The briefing is now based on REAL data — actual emails and actual calendar events — not just database tasks.

### 7.1 Update Edge Function: `generate-briefing`

Replace your existing generate-briefing function with this:

```typescript
// supabase/functions/generate-briefing/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId } = await req.json()
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const today = new Date().toISOString().split('T')[0]
  const GROQ_KEY = Deno.env.get('GROQ_API_KEY')

  // 1. Fetch user's tasks from DB
  const { data: tasks } = await supabase.from('tasks')
    .select('description, priority_score').eq('user_id', userId).eq('is_complete', false)
    .order('priority_score', { ascending: false }).limit(5)

  // 2. Fetch open loop count
  const { count: loopCount } = await supabase.from('open_loops')
    .select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_complete', false)

  // 3. Fetch today's calendar events
  let calendarEvents: any[] = []
  let unreadEmailCount = 0
  try {
    const token = await getGoogleToken(userId, supabase)

    const now = new Date()
    const dayEnd = new Date(now)
    dayEnd.setHours(23, 59, 59, 0)

    const [calRes, gmailRes] = await Promise.all([
      fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${dayEnd.toISOString()}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
    ])

    const calData = await calRes.json()
    const gmailData = await gmailRes.json()

    calendarEvents = (calData.items ?? []).map((e: any) => ({
      name: e.summary ?? 'Untitled',
      time: e.start?.dateTime
        ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : 'All day'
    }))
    unreadEmailCount = gmailData.resultSizeEstimate ?? 0
  } catch (e) {
    console.warn('Google API unavailable, using task data only:', e.message)
  }

  // 4. Build AI prompt with real data
  const prompt = `You are a calm productivity AI generating a morning briefing.
User data:
- Top tasks (by priority): ${JSON.stringify(tasks)}
- Open mental loops: ${loopCount}
- Today's calendar: ${JSON.stringify(calendarEvents)}
- Unread emails: ${unreadEmailCount}

Return ONLY this JSON structure, no extra text:
{
  "priorities": ["top task 1", "top task 2", "top task 3"],
  "schedule": [
    { "time": "9:00 AM", "activity": "..." },
    { "time": "11:00 AM", "activity": "..." },
    { "time": "2:00 PM", "activity": "..." }
  ],
  "insight": "one motivational sentence based on their actual workload",
  "warning": "if overloaded OR many unread emails, a gentle caution — else null",
  "emailAlert": ${unreadEmailCount > 10 ? '"You have ' + unreadEmailCount + ' unread emails — consider a 10-minute inbox triage before starting deep work."' : 'null'}
}`

  // 5. Call Groq AI
  let content: any = {}
  try {
    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5, max_tokens: 1000
      })
    })
    const json = await aiRes.json()
    content = JSON.parse(json.choices[0].message.content)
  } catch (e) {
    content = {
      priorities: tasks?.map((t: any) => t.description).slice(0, 3) ?? [],
      schedule: calendarEvents.map(e => ({ time: e.time, activity: e.name })),
      insight: 'Focus on what matters most today.',
      warning: null,
      emailAlert: null,
    }
  }

  // 6. Save to daily_briefings
  await supabase.from('daily_briefings').upsert({
    user_id: userId,
    briefing_date: today,
    content,
  }, { onConflict: 'user_id,briefing_date' })

  return new Response(JSON.stringify({ content }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 7.2 Frontend Changes — `src/pages/DailyBriefing.jsx`

The briefing UI needs no major changes — just display `data.emailAlert` if it exists:

```javascript
// Add to your briefing render, after the "insight" line:
{briefing.emailAlert && (
  <div className="email-alert-card">
    📧 {briefing.emailAlert}
    <button onClick={() => window.open('https://mail.google.com', '_blank')}>
      Open Gmail
    </button>
  </div>
)}
```

---

## MODULE 6 — One-Click AI Draft (S-15) + Gmail (Send + Thread Context)

**What changes:** 
1. Users can pick a real Gmail thread as context for their draft
2. Users can send the generated draft directly from CalmFlow via Gmail API

### 8.1 New Edge Function: `send-gmail-draft`

```typescript
// supabase/functions/send-gmail-draft/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId, to, subject, body, threadId } = await req.json()
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const token = await getGoogleToken(userId, supabase)

  // Build RFC 2822 formatted email
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ]
  const rawEmail = emailLines.join('\n')
  const encodedEmail = btoa(rawEmail).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const payload: any = { raw: encodedEmail }
  if (threadId) payload.threadId = threadId  // Reply to existing thread

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  const result = await res.json()
  if (result.id) {
    return new Response(JSON.stringify({ success: true, messageId: result.id }))
  }
  return new Response(JSON.stringify({ success: false, error: result.error }), { status: 500 })
})
```

### 8.2 Update Edge Function: `generate-draft`

Add Gmail thread fetching as context before generating the draft:

```typescript
// Inside generate-draft, add this BEFORE the AI prompt if draftType === 'email':
let emailContext = ''
if (draftType === 'email' && threadId) {
  try {
    const token = await getGoogleToken(userId, supabase)
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${threadId}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const msg = await res.json()
    // Extract plain text body (reuse extractBody helper from fetch-email-body)
    emailContext = `\n\nOriginal email thread context:\n${extractBody(msg.payload).slice(0, 2000)}`
  } catch (e) {
    console.warn('Could not fetch email thread context')
  }
}

// Then append emailContext to your existing prompt:
const prompt = `Write a ${draftType} with a ${tone} tone.
Context: ${contextInput}${emailContext}
Write the complete, ready-to-use ${draftType}. No explanation.`
```

### 8.3 Frontend Changes — `src/pages/AIDraft.jsx`

```javascript
// Add email thread picker when draftType === 'email'
const [recentEmails, setRecentEmails] = useState([])
const [selectedThread, setSelectedThread] = useState(null)

useEffect(() => {
  if (draftType === 'email') loadRecentEmails()
}, [draftType])

const loadRecentEmails = async () => {
  const { data } = await supabase.functions.invoke('fetch-gmail-threads', {
    body: { userId: user.id, maxResults: 8 }
  })
  setRecentEmails(data.emails ?? [])
}

// Send button handler
const handleSendViaGmail = async () => {
  if (!recipientEmail || !generatedContent) return
  setSending(true)
  const { data } = await supabase.functions.invoke('send-gmail-draft', {
    body: {
      userId: user.id,
      to: recipientEmail,
      subject: draftSubject,
      body: generatedContent,
      threadId: selectedThread?.id ?? null,
    }
  })
  if (data.success) showToast('Email sent via Gmail!', 'success')
  else showToast('Failed to send: ' + data.error, 'error')
  setSending(false)
}

// Add to JSX when draftType === 'email':
// Show email picker dropdown: recentEmails.map(e => ...)
// Show "Reply to thread" toggle
// Show "Send via Gmail" button after draft is generated
// Show recipient email input field
```

---

## MODULE 7 — Calm Mode (S-16) + Google Calendar

**What changes:** When entering Calm Mode, optionally show the user's next calendar event as a soft reminder ("Your next meeting: Standup at 3:00 PM") so they know when to resurface.

### 9.1 Frontend Changes — `src/pages/CalmMode.jsx`

```javascript
// Add this to CalmMode on mount — uses the already-fetched calendar data
const [nextEvent, setNextEvent] = useState(null)

useEffect(() => {
  const loadNextEvent = async () => {
    const { data } = await supabase.functions.invoke('fetch-calendar-events', {
      body: { userId: user.id }
    })
    const upcoming = (data.events ?? []).find(e => new Date(e.start) > new Date())
    setNextEvent(upcoming ?? null)
  }
  loadNextEvent()
}, [])

// Add to JSX — subtle, non-distracting, bottom of screen:
// {nextEvent && (
//   <div className="next-event-hint">
//     📅 Next: {nextEvent.summary} at {new Date(nextEvent.start).toLocaleTimeString()}
//   </div>
// )}
```

> ⚠️ NOTE: Keep this subtle. Calm Mode's design principle is minimal distraction. The calendar hint should be small text, low opacity, and placed at the very bottom. Do NOT show it during the timer countdown — only before the user starts the session.

---

## MODULE 8 — Weekly Analytics (S-17) + Gmail + Calendar + Drive

**What changes:** The weekly analytics now includes:
- How many emails were received vs sent this week (from Gmail)
- How many calendar events/meetings were attended (from Calendar)
- How many Drive docs were modified (from Drive)

This makes the productivity score feel real — it reflects actual digital activity, not just app usage.

### 10.1 New Edge Function: `fetch-weekly-google-stats`

```typescript
// supabase/functions/fetch-weekly-google-stats/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId } = await req.json()
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const token = await getGoogleToken(userId, supabase)

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
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 10.2 Frontend Changes — `src/pages/Analytics.jsx`

```javascript
// Add to your loadAnalytics function
const loadAnalytics = async () => {
  const [tasks, loops, sessions, googleStats] = await Promise.all([
    supabase.from('tasks').select('completed_at').eq('user_id', user.id).eq('is_complete', true).gte('completed_at', cutoff),
    supabase.from('open_loops').select('created_at').eq('user_id', user.id).eq('is_complete', true).gte('created_at', cutoff),
    supabase.from('focus_sessions').select('duration_minutes, session_date').eq('user_id', user.id).gte('created_at', cutoff),
    supabase.functions.invoke('fetch-weekly-google-stats', { body: { userId: user.id } })
  ])

  setGoogleStats(googleStats.data ?? { emailsSent: 0, meetingsAttended: 0, driveDocsModified: 0 })
  // ... existing chart building logic
}

// Add a new stats row to your analytics UI:
// <StatCard icon="📧" label="Emails Sent" value={googleStats.emailsSent} />
// <StatCard icon="📅" label="Meetings" value={googleStats.meetingsAttended} />
// <StatCard icon="📄" label="Docs Modified" value={googleStats.driveDocsModified} />
```

### 10.3 Update Edge Function: `analyse-week`

Include the Google stats in the AI analysis:

```typescript
// Update your analyse-week prompt to include Google data:
const prompt = `You are a productivity coach reviewing a user's week.
App activity:
- Tasks completed: ${tasksCompleted}
- Focus minutes: ${focusMinutes}
- Open loops closed: ${loopsClosed}

Real-world digital activity (from Google):
- Emails sent: ${emailsSent}
- Meetings attended: ${meetingsAttended}
- Documents worked on: ${driveDocsModified}

Give 4 insights in a JSON array of strings. Be honest, specific, and encouraging.
Example: ["You sent ${emailsSent} emails but only closed ${loopsClosed} loops — your inbox might be creating new open loops faster than you're closing them."]
Return ONLY: ["insight 1", "insight 2", "insight 3", "insight 4"]`
```

---

## STEP 4 — Deploy All New Edge Functions

```bash
# Deploy all new and updated functions
supabase functions deploy refresh-google-token
supabase functions deploy list-drive-files
supabase functions deploy fetch-drive-doc
supabase functions deploy fetch-gmail-threads
supabase functions deploy fetch-email-body
supabase functions deploy fetch-calendar-events
supabase functions deploy send-gmail-draft
supabase functions deploy fetch-weekly-google-stats

# Re-deploy updated functions
supabase functions deploy generate-briefing
supabase functions deploy generate-draft
supabase functions deploy priority-explain
supabase functions deploy analyse-week
```

---

## STEP 5 — Environment Variables & Secrets Summary

### Supabase Edge Function Secrets (set once via CLI):
```bash
supabase secrets set GROQ_API_KEY=your_groq_key
supabase secrets set GEMINI_API_KEY=your_gemini_key
supabase secrets set GOOGLE_CLIENT_ID=your_google_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Frontend `.env` (no changes needed):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

> ⚠️ NOTE: NEVER put Google Client Secret in frontend code or .env. It must only live in Supabase Edge Function secrets.

---

## Complete Integration Checklist

### Google Cloud Console
- [ ] Gmail API enabled
- [ ] Google Calendar API enabled
- [ ] Google Drive API enabled
- [ ] All required OAuth scopes added to consent screen
- [ ] App published (or test users added if still in testing mode)

### Supabase Auth
- [ ] signInWithOAuth updated with all Google scopes
- [ ] `access_type: 'offline'` and `prompt: 'consent'` added
- [ ] `provider_token` and `provider_refresh_token` extracted in AuthCallback

### Database
- [ ] `google_access_token`, `google_refresh_token`, `google_token_expiry` columns added to profiles table

### Supabase Secrets
- [ ] `GOOGLE_CLIENT_ID` set
- [ ] `GOOGLE_CLIENT_SECRET` set

### Edge Functions Deployed
- [ ] `refresh-google-token`
- [ ] `list-drive-files`
- [ ] `fetch-drive-doc`
- [ ] `fetch-gmail-threads`
- [ ] `fetch-email-body`
- [ ] `fetch-calendar-events`
- [ ] `send-gmail-draft`
- [ ] `fetch-weekly-google-stats`
- [ ] `generate-briefing` (updated)
- [ ] `generate-draft` (updated)
- [ ] `priority-explain` (updated)
- [ ] `analyse-week` (updated)

### Frontend
- [ ] Decomposer: Drive import button + file picker
- [ ] Open Loop Cleaner: Gmail import + Calendar import buttons
- [ ] Summary+Timer: Gmail picker + Drive picker for input
- [ ] Priority Engine: Calendar-aware AI explanation
- [ ] Daily Briefing: Real calendar + email alert display
- [ ] AI Draft: Thread picker + Send via Gmail button + recipient input
- [ ] Calm Mode: Next calendar event hint at bottom
- [ ] Analytics: Google stats cards + updated AI insights

---

## Testing Sequence (Do in This Order)

1. Sign out and sign back in — confirm the Google consent screen now asks for Gmail/Calendar/Drive permissions
2. Check Supabase → Table Editor → profiles — confirm `google_access_token` is populated
3. Test `refresh-google-token` manually via Supabase Edge Function logs
4. Open Loop Cleaner → click "Import from Gmail" — confirm loops appear
5. Open Loop Cleaner → click "Import from Calendar" — confirm events imported
6. Summary+Timer → click "Pick from Drive" — confirm document list appears
7. AI Daily Briefing → regenerate — confirm calendar events appear in schedule
8. AI Draft → select Email type → confirm Gmail thread picker appears → generate → send
9. Weekly Analytics → confirm Google stats cards show real numbers
10. Calm Mode → confirm next calendar event hint appears before starting timer

---

*CalmFlow AI · Proxion 2026 · Google Integrations README v1.0*  
*Stack: React · Supabase · Groq AI · Gmail API · Calendar API · Drive API*