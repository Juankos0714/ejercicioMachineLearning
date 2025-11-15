# Fix: Teams Table 404 Error

## Problem

You're seeing this error in the browser console:

```
GET https://kwbjdxwustcludtekhqb.supabase.co/rest/v1/teams?select=*&league=eq.Premier+League&order=name.asc 404 (Not Found)
```

## Root Cause

The `teams` table doesn't exist in your Supabase database. This happens when the database migrations haven't been applied yet to your Supabase project.

## Solution

Follow these steps to set up your database:

### Step 1: Access Your Supabase SQL Editor

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in to your account
3. Open your project (the one with URL: `https://kwbjdxwustcludtekhqb.supabase.co`)
4. Click on **SQL Editor** in the left sidebar
5. Click **New query**

### Step 2: Run the Setup Script

1. Open the file `supabase/setup-database.sql` in this project
2. Copy the ENTIRE contents of the file
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Ctrl/Cmd + Enter)
5. Wait for the script to complete (should take a few seconds)

### Step 3: Verify the Setup

After running the script, verify that everything is set up correctly:

1. In Supabase, go to **Database** → **Tables** in the left sidebar
2. You should see these tables:
   - ✅ `teams` - Contains 38 teams from 5 leagues
   - ✅ `matches` - Empty for now
   - ✅ `predictions` - Empty for now
   - ✅ `team_stats` - Empty for now

3. Click on the `teams` table
4. You should see teams like Manchester City, Real Madrid, Bayern Munich, etc.

### Step 4: Test the Application

1. Refresh your browser (F5 or Ctrl/Cmd + R)
2. Clear browser cache if needed (Ctrl/Cmd + Shift + Delete)
3. The 404 error should be gone
4. You should now be able to:
   - Select a league from the dropdown
   - See teams populate in the team selectors
   - Generate predictions

## What the Script Does

The `setup-database.sql` script:

✅ Creates all required tables (`teams`, `matches`, `predictions`, `team_stats`)
✅ Sets up indexes for better performance
✅ Configures Row Level Security (RLS) policies
✅ Seeds the database with 38 teams from 5 major leagues:
   - Premier League (10 teams)
   - La Liga (6 teams)
   - Serie A (6 teams)
   - Bundesliga (6 teams)
   - Ligue 1 (6 teams)

## Troubleshooting

### Still seeing 404 errors?

1. **Verify the script ran successfully**:
   - Check for any red error messages in the SQL Editor
   - Make sure you clicked "Run" and the query completed

2. **Check tables exist**:
   - Go to **Database** → **Tables**
   - Confirm `teams` table is listed
   - Click on it to see the data

3. **Clear browser cache**:
   - The old 404 response might be cached
   - Hard refresh: Ctrl/Cmd + Shift + R

4. **Check RLS policies**:
   - Go to **Authentication** → **Policies**
   - Make sure the `teams` table has a policy allowing SELECT

### "Permission denied" errors?

If you see permission errors, run this in SQL Editor:

```sql
-- Grant public access to teams table
CREATE POLICY "Enable read access for all users"
  ON teams FOR SELECT
  TO public
  USING (true);
```

### Need to start fresh?

If you want to reset everything, the setup script includes `DROP TABLE IF EXISTS` commands at the top. Running it again will:
1. Delete all existing data
2. Recreate all tables
3. Re-seed with fresh data

⚠️ **Warning**: This will delete any matches or predictions you've created!

## Next Steps

Once the 404 error is resolved:

1. ✅ Test predictions with different teams
2. 📊 Add real match data (see `SETUP.md`)
3. 🤖 Train ML models (see `MACHINE_LEARNING.md`)
4. 📈 Set up live markets integration (see `LIVE_MARKETS_SETUP.md`)

## Need More Help?

- Check the [Supabase Documentation](https://supabase.com/docs)
- Review `SUPABASE_SETUP.md` for detailed Supabase configuration
- Check browser console for detailed error messages
