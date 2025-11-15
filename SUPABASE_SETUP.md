# Supabase Setup Guide

## Problem: DNS Resolution Error

If you're seeing an error like:
```
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
xrdnxlqxtpcpsvnqnkgs.supabase.co
```

This means your Supabase configuration is missing or incorrect.

## Solution: Configure Your Supabase Project

### Step 1: Create or Access Your Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in or create a free account
3. Create a new project or select an existing one
4. Wait for the project to finish provisioning (takes ~2 minutes)

### Step 2: Get Your Project Credentials

1. In your Supabase project dashboard, click on **Settings** (gear icon)
2. Navigate to **API** in the left sidebar
3. You'll see two important values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Project API keys** > **anon public**: A long string starting with `eyJ...`

### Step 3: Update Your .env File

1. Open the `.env` file in the root of this project (it should already exist)
2. Replace the placeholder values:

```env
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
```

**Important**:
- Copy the ENTIRE anon key (it's very long, ~200+ characters)
- Make sure there are no extra spaces or line breaks
- The URL should start with `https://` and end with `.supabase.co`

### Step 4: Set Up the Database Schema

**⚡ Quick Setup (Recommended)**

If this is a new Supabase project, use the all-in-one setup script:

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy and paste the **entire contents** of `supabase/setup-database.sql`
4. Click **Run** to execute the SQL

This single script will:
- ✅ Create all tables (`teams`, `matches`, `predictions`, `team_stats`)
- ✅ Set up indexes for performance
- ✅ Configure Row Level Security (RLS) policies
- ✅ Seed 38 teams from 5 major leagues
- ✅ Everything you need in one step!

**Alternative: Manual Setup**

If you prefer step-by-step setup:

1. Run `supabase/migrations/20251106183743_create_football_prediction_tables.sql` to create tables
2. Run `scripts/seed-database.sql` to add sample teams
3. Configure RLS policies (see below)

### Step 5: Verify the Setup

After running the setup script, verify in Supabase dashboard:

1. Go to **Database** → **Tables**
2. You should see: `teams`, `matches`, `predictions`, `team_stats`
3. Click on `teams` - you should see 38 teams across 5 leagues
4. Go to **Authentication** → **Policies**
5. Verify `teams` table has a SELECT policy for public access

### Step 6: Restart Your Dev Server

After updating the `.env` file:

1. Stop your development server (Ctrl+C)
2. Clear browser cache and local storage (optional but recommended)
3. Restart: `npm run dev`
4. The application should now connect successfully

## Troubleshooting

### Still seeing DNS errors?

1. **Check .env file exists**: Run `ls -la .env` in the project root
2. **Verify file contents**: Run `cat .env` and check the values
3. **Restart dev server**: Environment variables are loaded at startup
4. **Clear browser cache**: Old URLs might be cached

### "Invalid Supabase URL" error?

- Make sure the URL starts with `https://`
- Make sure it ends with `.supabase.co`
- Don't include `/rest/v1/` or any other path
- Example: `https://abcdefghijklmnop.supabase.co`

### "Invalid Supabase anon key" error?

- The anon key should be very long (~200+ characters)
- It should start with `eyJ`
- Make sure you copied the entire key
- Use the **anon public** key, not the service role key

### Database tables not found (404 errors)?

**See the detailed fix guide: `FIX_404_ERROR.md`**

Quick fix:
- Run the SQL from `supabase/setup-database.sql` in Supabase SQL Editor
- Check that tables exist in **Database** > **Tables**
- Verify RLS policies are set correctly
- Clear browser cache and refresh

## Testing Your Configuration

Once configured, you should be able to:

1. Visit the application
2. Select a league from the dropdown
3. See teams populate in the team selectors
4. Generate predictions

If you can see teams, your Supabase connection is working! 🎉

## Need Help?

- Check the [Supabase Documentation](https://supabase.com/docs)
- Review the project's `SETUP.md` file
- Check browser console for detailed error messages
