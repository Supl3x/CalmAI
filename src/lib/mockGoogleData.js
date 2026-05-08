/**
 * Offline demo data when Google APIs or tokens are unavailable.
 * Replace with your own copy from screenshots if you want it to match your inbox.
 */

function padTime(d, h, m) {
  const x = new Date(d)
  x.setHours(h, m, 0, 0)
  return x
}

export function buildMockBriefingContent() {
  const now = new Date()
  const t = (h, m) =>
    padTime(now, h, m).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const calendar_events = [
    {
      id: 'mock-cal-1',
      name: 'Team standup',
      time: t(9, 30),
      start: padTime(now, 9, 30).toISOString(),
      end: padTime(now, 9, 45).toISOString(),
      description: 'Quick sync on blockers and priorities for the day.',
      location: 'Meet / Zoom',
      meetLink: 'https://meet.google.com/mock-demo-link',
      attendees: [{ email: 'you@example.com', responseStatus: 'accepted' }, { email: 'team@example.com', responseStatus: 'accepted' }],
    },
    {
      id: 'mock-cal-2',
      name: 'Client review — project timeline',
      time: t(14, 0),
      start: padTime(now, 14, 0).toISOString(),
      end: padTime(now, 15, 0).toISOString(),
      description: 'Walk through milestones and confirm deliverable dates.',
      location: 'Conference Room A',
      meetLink: '',
      attendees: [{ email: 'client@example.com', responseStatus: 'tentative' }],
    },
    {
      id: 'mock-cal-3',
      name: 'Focus block: deep work',
      time: t(16, 0),
      start: padTime(now, 16, 0).toISOString(),
      end: padTime(now, 17, 30).toISOString(),
      description: 'No meetings — ship the highest-priority task.',
      location: '',
      meetLink: '',
      attendees: [],
    },
  ]

  return {
    top_3_priorities: [
      'Reply to budget thread before EOD',
      'Prep slides for client review',
      'Clear the two oldest unread action items',
    ],
    suggested_schedule: calendar_events.map((e) => ({ time: e.time, activity: e.name })),
    cognitive_overload_warning: {
      is_overloaded: true,
      message: 'Demo day: three calendar blocks — protect your focus block at 4pm.',
    },
    motivational_insight: 'Demo mode: this briefing is sample data. Connect Google or paste your own tasks when APIs work.',
    calendar_events,
    unread_emails: 0,
    open_loops: 2,
    yesterday: { tasks_completed: 3, focus_minutes: 90 },
    _demo: true,
  }
}

export function buildMockWeeklyGoogleStats() {
  return {
    emailsSent: 42,
    meetingsAttended: 11,
    driveDocsModified: 6,
    _demo: true,
  }
}

export function buildMockGmailTasks(userId) {
  return [
    {
      user_id: userId,
      title: 'Reply: Q2 budget approval needed',
      description: 'Demo email task — Finance needs sign-off by Friday. (Replace with your real thread.)',
      ai_difficulty: 'hard',
      ai_priority_score: 92,
      ai_generated: true,
      ai_source: 'demo_gmail',
      status: 'todo',
    },
    {
      user_id: userId,
      title: 'Follow up: design feedback',
      description: 'Demo — Thread asked for revised mockups by Wednesday.',
      ai_difficulty: 'medium',
      ai_priority_score: 78,
      ai_generated: true,
      ai_source: 'demo_gmail',
      status: 'todo',
    },
    {
      user_id: userId,
      title: 'Confirm meeting time with vendor',
      description: 'Demo — Short scheduling ping; unblock procurement.',
      ai_difficulty: 'easy',
      ai_priority_score: 55,
      ai_generated: true,
      ai_source: 'demo_gmail',
      status: 'todo',
    },
  ]
}

export const MOCK_PRIORITY_EXPLANATION =
  'Demo mode: these tasks mirror typical urgent inbox items. When Google is connected, the same flow pulls from your real unread mail. Highest score first — tackle the budget reply before lower-priority scheduling.'
