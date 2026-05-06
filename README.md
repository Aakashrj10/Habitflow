# Habitflow

A full-stack habit tracking app with AI-powered suggestions.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Supabase · Anthropic Claude API

---

## Setup in 5 steps

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL editor, run the contents of `supabase/schema.sql`
3. Copy your project URL and anon key from **Settings → API**

### 3. Set up environment variables
```bash
cp .env.local.example .env.local
```
Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 4. Get your Anthropic API key
Go to [console.anthropic.com](https://console.anthropic.com), create an API key, paste it in `.env.local`

### 5. Run the app
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── habits/route.ts       # GET all habits, POST create habit
│   │   ├── logs/route.ts         # GET logs, POST check-in
│   │   └── suggestions/route.ts  # POST → Claude AI insights
│   ├── dashboard/page.tsx        # Main dashboard
│   ├── login/page.tsx            # Auth
│   └── auth/callback/route.ts    # Supabase auth callback
├── components/
│   ├── ui/Sidebar.tsx
│   ├── habits/HabitCard.tsx
│   ├── habits/AddHabitModal.tsx
│   └── dashboard/
│       ├── DashboardClient.tsx
│       └── AIInsightsPanel.tsx
├── lib/
│   ├── supabase.ts               # Supabase clients
│   └── utils.ts                  # Helpers, streak calc
└── types/index.ts                # All TypeScript types
```

---

## What's built (Phase 1 & 2)

- [x] Auth (sign up, sign in, sign out)
- [x] Create habits with category, frequency, reminder time
- [x] Daily check-in (mark done / skipped)
- [x] Streak tracking (auto-calculated via DB trigger)
- [x] Dashboard with stats
- [x] AI suggestions via Claude API

## Coming next (Phase 3+)

- [ ] Analytics page with heatmap calendar
- [ ] Weekly/monthly completion charts (Recharts)
- [ ] Journal page
- [ ] Email reminders (Resend)
- [ ] Mobile responsiveness polish
- [ ] Deployment (Vercel + Supabase)
