# ⚙️ COMPLETE SUPABASE CONFIGURATION GUIDE

This guide walks you through **every step** to configure Supabase completely for CollabChat.

---

## 📋 Overview - What We'll Do

1. ✅ Create Supabase project
2. ✅ Get API credentials
3. ✅ Create storage buckets
4. ✅ Import database schema
5. ✅ Verify tables & relationships
6. ✅ Setup Row Level Security (RLS)
7. ✅ Configure authentication
8. ✅ Setup CORS
9. ✅ Test the connection
10. ✅ Verify environment variables

**Estimated time: 15-20 minutes**

---

## STEP 1: Create Supabase Project

### 1a. Sign Up
- Go to **https://supabase.com**
- Click **Sign Up**
- Choose **Sign up with GitHub** (easier)
- Authorize GitHub access
- Click **Continue**

### 1b. Create First Project
- You'll see "Welcome to Supabase"
- Click **New Project** or **Create a new project**

### 1c. Project Settings
Fill in the form:
```
Project Name: collabchat
Database Password: (create strong password, save it!)
Region: (pick closest to you - us-east-1, eu-west-1, ap-northeast-1, etc)
Pricing Plan: Free (default)
```

Click **Create new project**

**⏳ Wait 2-3 minutes** - Supabase initializes the PostgreSQL database

You'll see the dashboard load with:
- Project name at top
- Status showing "Running" ✓
- Menu on left side

---

## STEP 2: Get Your API Credentials

### 2a. Navigate to Settings
- Click **Settings** (gear icon, bottom left)
- Click **API** (in left menu)

### 2b. Copy Project URL
- Find section: **Project URL**
- Copy the URL (looks like `https://xxxxx.supabase.co`)
- **Save this as `VITE_SUPABASE_URL`**

Example:
```
https://jojgmljggorakkpfiunl.supabase.co
```

### 2c. Copy API Keys
- Find section: **Project API keys**
- You'll see two keys:
  - **anon public** (starts with `sb_publishable_`)
  - **service_role secret** (starts with `sb_api_`)

- Copy **anon public** key
- **Save this as `VITE_SUPABASE_ANON_KEY`**

Example:
```
sb_publishable_nL0WPcTr8qnoC3RLE0kiqg_JLzkMSdW
```

⚠️ **IMPORTANT:**
- Use `anon public` for frontend (public)
- Never use `service_role` in frontend code
- Don't commit these keys to GitHub (use `.env` instead)

---

## STEP 3: Create Storage Buckets

### 3a. Go to Storage
- Click **Storage** (left menu)
- Click **Create a new bucket**

### 3b. Create "avatars" Bucket
```
Bucket name: avatars
Public bucket: YES (enable toggle)
```
Click **Create bucket**

### 3c. Create "files" Bucket
```
Bucket name: files
Public bucket: YES (enable toggle)
```
Click **Create bucket**

### 3d. Create "messages" Bucket
```
Bucket name: messages
Public bucket: YES (enable toggle)
```
Click **Create bucket**

**Verify:** You should see 3 buckets:
- ✓ avatars (public)
- ✓ files (public)
- ✓ messages (public)

---

## STEP 4: Import Database Schema

### 4a. Open SQL Editor
- Click **SQL Editor** (left menu)
- Click **New Query**

### 4b. Get the Schema File
In your project folder, open:
```
supabase/schema.sql
```

Copy the **entire contents**

### 4c. Paste Schema
- In Supabase SQL Editor, paste the schema
- You should see SQL code filling the editor

### 4d. Execute Schema
- Click **Run** button (or Ctrl+Enter)
- Wait for completion...
- You should see ✓ message at bottom

⏳ **Wait for all queries to finish** (usually 2-5 seconds)

### 4e. Verify Tables Created
- Click **Table Editor** (left menu)
- You should see tables:
  - ✓ users
  - ✓ workspaces
  - ✓ rooms
  - ✓ messages
  - ✓ files
  - ✓ tasks
  - ✓ task_assignments
  - ✓ notifications
  - ✓ private_messages

If tables don't appear:
- Scroll down in table list
- Try refreshing page (F5)
- Check SQL Editor for error messages

---

## STEP 5: Verify Database Tables

### 5a. Click Each Table to Verify

**users table:**
- Columns: id, email, username, avatar_url, disabled, created_at, updated_at
- Click it to expand

**workspaces table:**
- Columns: id, name, owner_id, invite_code, created_at, updated_at

**rooms table:**
- Columns: id, workspace_id, name, created_by, created_at, updated_at

**messages table:**
- Columns: id, room_id, user_id, content, created_at, updated_at

**Etc...**

### 5b. Check Relationships
- Tables should have foreign keys (arrows between tables)
- Example: messages.user_id → users.id

If tables are empty or don't have data yet - that's okay! They'll populate when users interact with the app.

---

## STEP 6: Setup Row Level Security (RLS)

RLS policies control who can read/write data. Let's set them up.

### 6a. Enable RLS on All Tables

For each table (users, workspaces, rooms, messages, files, tasks, notifications, private_messages):

1. Click table name in Table Editor
2. Click **Settings** (top right)
3. Toggle **Enable RLS** ON
4. Click **Save**

**Do this for all tables!**

### 6b. Create RLS Policies

#### Policy 1: Users can read public data

For **users** table:
1. Click **users** table
2. Click **Settings** → **Auth Policies**
3. Click **New Policy**
4. Click **Get Started**
5. Choose **Create a policy from scratch**

Fill in:
```
Policy name: users_select
Allowed operation: SELECT
Target role: authenticated
Using expression: true
```

Click **Save policy**

#### Policy 2: Users can read workspace data

For **workspaces** table:
1. Click **workspaces** table
2. Click **Settings** → **Auth Policies**
3. New Policy → Blank policy

Fill in:
```
Policy name: workspaces_select
Allowed operation: SELECT
Target role: authenticated
Using expression: true
```

Click **Save policy**

#### Policy 3: Users can read room messages

For **messages** table:
1. Click **messages** table
2. New Policy → Blank policy

Fill in:
```
Policy name: messages_select
Allowed operation: SELECT
Target role: authenticated
Using expression: true
```

#### Policy 4: Users can insert messages

1. Same **messages** table
2. New Policy → Blank policy

Fill in:
```
Policy name: messages_insert
Allowed operation: INSERT
Target role: authenticated
With check expression: auth.uid() = user_id
```

#### Policy 5: Users can read files

For **files** table:
1. Click **files** table
2. New Policy → Blank policy

Fill in:
```
Policy name: files_select
Allowed operation: SELECT
Target role: authenticated
Using expression: true
```

**Repeat similar patterns for other tables.**

⚠️ **Note:** RLS prevents anonymous access. For public data (like landing page), either:
- Disable RLS on those tables, OR
- Create anonymous policies

---

## STEP 7: Configure Authentication

### 7a. Go to Authentication Settings
- Click **Authentication** (left menu)
- Click **Settings** (gear icon)

### 7b: Enable Email/Password Auth
- Scroll to **Auth Providers**
- Find **Email** → toggle **Enable**
- Toggle **Confirm email** OFF (for easier testing)
- Click **Save**

### 7c: Setup Redirect URLs
- Go to **URL Configuration**
- Add Redirect URLs:
  ```
  http://localhost:3000
  http://localhost:3000/
  http://localhost:3000/login
  http://localhost:3000/dashboard
  https://collabchat-XXXXX.vercel.app
  https://collabchat-XXXXX.vercel.app/
  ```

- Click **Save**

### 7d: Setup JWT Expiry (Optional)
- Go back to **General**
- Find **JWT expiration time**
- Set to: 3600 (1 hour) or 86400 (24 hours)
- Click **Save**

---

## STEP 8: Setup CORS

### 8a. Go to CORS Settings
- Click **Settings** (gear icon, bottom left)
- Click **API** (in left menu)

### 8b: Add CORS Origins
Find section: **CORS Allowed Origins**

Click **Add** and add these:
```
http://localhost:3000
http://localhost:3001
http://localhost:4173
http://localhost:5173
https://collabchat-XXXXX.vercel.app
https://your-custom-domain.com
```

Click **Save** after each addition

---

## STEP 9: Test Supabase Connection Locally

### 9a. Update .env file
In your project root, create/update `.env`:

```
VITE_SUPABASE_URL=https://jojgmljggorakkpfiunl.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_nL0WPcTr8qnoC3RLE0kiqg_JLzkMSdW
```

(Use your actual credentials from Step 2)

### 9b. Start Dev Server
```bash
npm run dev
```

### 9c. Test in Browser
1. Open http://localhost:3000 in browser
2. Open **F12** (Developer Tools) → **Console** tab
3. Try to register a new account on login page
4. Check console for errors

### 9d: Check Supabase Dashboard
- Go to Supabase Dashboard
- Click **Authentication** → **Users**
- You should see your new user! ✓

If user appears, Supabase is working!

### 9e: Test Chat Feature
1. Register 2 different accounts
2. Create a workspace
3. Send a message
4. Go to Supabase → **Table Editor** → **messages**
5. You should see your message in the table! ✓

---

## STEP 10: Verify Everything is Working

### ✅ Checklist:

- [ ] Supabase project created and running
- [ ] API URL and key copied to `.env`
- [ ] 3 storage buckets created (avatars, files, messages)
- [ ] Database schema imported successfully
- [ ] All tables visible in Table Editor
- [ ] RLS enabled on tables
- [ ] Email authentication enabled
- [ ] CORS origins added
- [ ] Can register new user locally
- [ ] User appears in Supabase Auth
- [ ] Can create workspace
- [ ] Can send message to database
- [ ] Message appears in Supabase table

---

## 🆘 TROUBLESHOOTING SUPABASE

### "Cannot connect to Supabase"
**Solution:**
1. Check API URL is correct (copy-paste, don't type)
2. Check API key is correct (copy-paste)
3. Verify both in `.env` file
4. Restart dev server: `npm run dev`

### "CORS error" when uploading files
**Solution:**
1. Go to Supabase → Settings → API
2. Add your domain to CORS Allowed Origins
3. Wait 1-2 minutes
4. Try again

### "RLS violation" error
**Solution:**
1. User must be authenticated
2. Check RLS policies exist
3. Verify policy conditions are correct
4. Try: `auth.uid() = user_id` in policies

### "Table doesn't exist"
**Solution:**
1. Schema.sql might not have run
2. Go to SQL Editor
3. Paste schema.sql again
4. Click Run

### "Users table empty"
**Solution:**
- Normal! Users only appear when they register
- Try registering a new account
- Then check Users table

### "Files won't upload"
**Solution:**
1. Check bucket names are correct (avatars, files, messages)
2. Check buckets are PUBLIC (not private)
3. Add CORS origins in Settings → API
4. Check file size < 10MB

---

## 🔐 SECURITY CHECKLIST

- [ ] RLS enabled on all tables
- [ ] Correct policies set (users can't see others' data)
- [ ] Don't use service_role key in frontend
- [ ] Never commit `.env` to GitHub
- [ ] Use strong database password
- [ ] Enable 2FA on Supabase account
- [ ] Regularly review access logs

---

## 📱 Environment Variables Summary

### For Local Development (`.env`):
```
VITE_SUPABASE_URL=https://jojgmljggorakkpfiunl.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_nL0WPcTr8qnoC3RLE0kiqg_JLzkMSdW
```

### For Production (Vercel):
Same values, added in:
**Vercel Dashboard → Project Settings → Environment Variables**

### For GitHub (DON'T DO THIS):
❌ Never commit `.env` to GitHub
✅ Only commit `.env.example` with placeholder values

---

## 🎯 Next Steps After Supabase Setup

1. Test locally: `npm run dev`
2. Verify all features work
3. Create GitHub repo
4. Deploy to Vercel
5. Add same env variables to Vercel
6. Test on live URL

---

## 📞 Need Help?

### Check These Resources:
- **Supabase Docs:** https://supabase.com/docs
- **SQL Issues:** https://supabase.com/docs/guides/database
- **Auth Issues:** https://supabase.com/docs/guides/auth
- **Storage Issues:** https://supabase.com/docs/guides/storage

### Common Questions:

**Q: Can I change region after creating project?**
A: No, create a new project if needed.

**Q: How much does Supabase cost?**
A: Free tier includes 500MB database + 1GB storage. Upgrade to paid as needed.

**Q: Can I backup my database?**
A: Yes, Supabase auto-backs up. Go to Settings → Backups.

**Q: How do I connect to PostgreSQL directly?**
A: Get connection string in Settings → Database. Use psql or database client.

---

## ✨ You're Ready!

After completing all steps:
- ✅ Supabase fully configured
- ✅ Database tables created
- ✅ Authentication working
- ✅ Storage buckets ready
- ✅ Ready to deploy

**Next: Follow SETUP_TO_DEPLOY.md to go live!**

---

**Congratulations! Your backend is now ready! 🎉**
