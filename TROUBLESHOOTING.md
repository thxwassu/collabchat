# 🔧 Deployment Troubleshooting Guide

## Common Issues & Solutions

---

## ❌ "Build Failed" on Vercel

### Error: `npm ERR! peer dep missing`
**Solution:**
1. Update `package.json`:
   ```json
   {
     "dependencies": {
       "@supabase/supabase-js": "^2.49.4",
       "vite": "^6.3.5"
     }
   }
   ```
2. Delete `node_modules` folder locally:
   ```bash
   rmdir /s /q node_modules
   npm install
   ```
3. Push to GitHub
4. Redeploy on Vercel

---

## ❌ Environment Variables Not Working

### "VITE_SUPABASE_URL is undefined"
**Solution:**
1. Variables must start with `VITE_` ✓
2. In Vercel, go **Settings → Environment Variables**
3. Add both:
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```
4. Save and **Redeploy** (important!)
5. Click **Deployments → Redeploy** in Vercel

---

## ❌ Supabase Connection Errors

### "Connection refused" or "404 Not Found"
**Solution:**

1. **Verify Supabase URL:**
   - Go to Supabase Dashboard
   - Click **Settings → API**
   - Copy exact Project URL
   - Should look like: `https://xxxxx.supabase.co`

2. **Verify Supabase Key:**
   - Same location, copy `anon public` key
   - NOT the service_role key
   - Should be 60+ characters

3. **Check Environment Variables in Vercel:**
   ```
   VITE_SUPABASE_URL = https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = sb_publishable_xxxxx
   ```

4. **Verify `.env.production` locally:**
   ```bash
   cat .env.production
   ```
   Should show correct values

5. **Test locally first:**
   ```bash
   npm run build
   npm run preview
   ```
   Visit http://localhost:4173 to test

---

## ❌ File Upload Not Working

### "Cannot upload to storage"
**Solution:**

1. **Create buckets in Supabase:**
   - Go to **Storage** tab
   - Create bucket: `avatars` (PUBLIC)
   - Create bucket: `files` (PUBLIC)
   - Create bucket: `messages` (PUBLIC)

2. **Make buckets PUBLIC:**
   - Click each bucket name
   - Click **Settings**
   - Toggle **Make bucket public** ON
   - Click **Save**

3. **Verify in code:**
   - Check `supabaseClient.js`
   - Bucket names must match exactly:
     ```javascript
     const BUCKET_NAMES = {
       avatars: 'avatars',
       files: 'files',
       messages: 'messages'
     };
     ```

4. **Add CORS to Supabase:**
   - Go to **Settings → API → CORS**
   - Add your domain:
     ```
     https://collabchat-XXXXX.vercel.app
     https://your-domain.com
     ```

---

## ❌ Database Tables Don't Exist

### "Relation 'public.users' does not exist"
**Solution:**

1. Go to Supabase → **SQL Editor**
2. Click **New Query**
3. Open file: `supabase/schema.sql`
4. Copy entire contents
5. Paste into SQL query box
6. Click **Run**
7. Wait for all tables to create

**Verify:**
- Go to **Tables** tab
- Should see: `users`, `workspaces`, `rooms`, `messages`, etc.

---

## ❌ Blank Page or 404 Error

### Page shows nothing when visiting live URL
**Solution:**

1. **Check build output:**
   - In Vercel, go to **Deployments**
   - Click failed/latest deployment
   - Check logs for errors

2. **Verify dist folder:**
   ```bash
   npm run build
   ls dist/
   ```
   Should see: `index.html`, `assets/`, etc.

3. **Check `.gitignore`:**
   - Make sure `dist/` is NOT in `.gitignore`
   - Otherwise Vercel won't have files to deploy

4. **Browser console (F12):**
   - Open Developer Tools
   - Check **Console** tab for errors
   - Check **Network** tab to see 404s

5. **Common fixes:**
   - Clear browser cache (Ctrl+Shift+Delete)
   - Hard refresh (Ctrl+F5)
   - Try incognito window

---

## ❌ Git Push Fails

### "fatal: branch 'main' set up to track 'origin/main'"
**Solution:**
```bash
git push -u origin main
# or
git push --force-with-lease origin main
```

### "Authentication failed for GitHub"
**Solution:**
1. Generate GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click **Generate new token (classic)**
   - Check `repo` scope
   - Copy token
   
2. Use token as password:
   ```bash
   git push
   # Username: YOUR_USERNAME
   # Password: (paste token, not your actual password)
   ```

---

## ❌ Real-Time Chat Not Working

### Messages don't appear in real-time
**Solution:**

1. **Check Supabase Realtime:**
   - Go to Supabase Dashboard
   - Check status at bottom
   - Replication should be enabled

2. **Verify Row Level Security:**
   - Go to **SQL Editor**
   - Check that RLS policies exist on tables
   - Should allow authenticated users to read

3. **Test locally first:**
   ```bash
   npm run dev
   # Open 2 browser windows
   # Send message in one, should appear in other
   ```

4. **Browser console:**
   - Open F12 → Console
   - Look for Realtime subscription errors
   - Check WebSocket connection

---

## ❌ Authentication Fails

### "Can't register" or "Login loop"
**Solution:**

1. **Verify Supabase Auth enabled:**
   - Go to Supabase → **Settings → Auth**
   - Check **Email/Password** is enabled

2. **Check email confirmation:**
   - Test locally first: `npm run dev`
   - Register with email
   - Check browser console for errors

3. **Verify redirect URL:**
   - Go to Supabase → **Settings → Auth**
   - Add redirect URL:
     ```
     https://collabchat-XXXXX.vercel.app
     http://localhost:3000
     ```

4. **Test in browser console:**
   ```javascript
   // F12 → Console
   const supabase = window.supabaseClient;
   const user = await supabase.auth.getUser();
   console.log(user);
   ```

---

## ❌ Mobile App Won't Load

### "Connection refused" on phone
**Solution:**

1. **If on same network:**
   - Use network URL: `http://10.52.29.249:3000`
   - Or get local IP:
     ```bash
     ipconfig
     # Find "IPv4 Address"
     ```

2. **If on different network:**
   - Use Vercel public URL: `https://collabchat-XXXXX.vercel.app`
   - Mobile and PC must both have internet

3. **Test connectivity:**
   - On phone, open Settings → Wi-Fi
   - Verify connected to same network as PC

4. **Check Windows Firewall:**
   - Windows Defender Firewall
   - Allow `vite` / Node through firewall
   - Or temporarily disable for testing

---

## ❌ High Disk Usage After Build

### `node_modules` is huge (~200MB)
**Solution:**
```bash
# Don't commit node_modules to GitHub!
# Verify .gitignore includes:
echo "node_modules/" >> .gitignore

# Or if already committed:
git rm -r --cached node_modules
git add .gitignore
git commit -m "Remove node_modules from git"
git push
```

Vercel will run `npm install` automatically.

---

## ❌ CORS (Cross-Origin) Errors

### "Access to fetch has been blocked by CORS policy"
**Solution:**

1. **In Supabase:**
   - Go to **Settings → API → CORS**
   - Add your domain:
     ```
     https://collabchat-XXXXX.vercel.app
     https://your-domain.com
     http://localhost:3000
     ```
   - Click **Save**

2. **In your code (if needed):**
   - Supabase client automatically handles CORS
   - No need for manual headers

3. **Test:**
   - Refresh page
   - Open console (F12)
   - Try action that was failing

---

## ❌ Slow Deployment Times

### Vercel takes 5+ minutes to deploy
**Solution:**

1. **Check build logs:**
   - Vercel dashboard → Deployments
   - Click deployment to see logs
   - Look for slow steps

2. **Optimize package.json:**
   - Remove unused dependencies
   - Update to latest versions:
     ```bash
     npm update
     npm audit fix
     ```

3. **Check commit size:**
   - Don't commit large files
   - Keep `.gitignore` clean

4. **Force rebuild:**
   - Go to Vercel dashboard
   - Click **Redeploy** button
   - Usually faster than new deployment

---

## ✅ Testing Your Deployment

### Quick verification checklist:
```bash
# 1. Build locally
npm run build

# 2. Test build output
npm run preview
# Visit http://localhost:4173

# 3. Verify environment variables
cat .env.production

# 4. Verify git status
git status

# 5. Push changes
git push origin main

# 6. Monitor Vercel deployment
# Go to https://vercel.com/dashboard
```

---

## 📞 Getting Help

### Before asking for help, collect:
1. **Error message** (full text from console)
2. **Browser console errors** (F12 → Console)
3. **Vercel deployment logs** (Deployments → Click deployment)
4. **Supabase status** (check dashboard)
5. **What you tried** (steps you already took)

---

## 🎯 Still Not Working?

1. **Start fresh:**
   ```bash
   rm -r node_modules
   npm install
   npm run build
   ```

2. **Check internet connection**

3. **Try different browser**

4. **Verify all credentials** (copy-paste, not type)

5. **Wait a few minutes** (services sometimes need time to sync)

6. **Clear cache:**
   - Ctrl+Shift+Delete
   - Clear browsing data
   - Try incognito window

---

**Most issues resolve by:**
1. Clearing cache
2. Redeploying
3. Checking environment variables
4. Verifying Supabase tables exist

Good luck! 🚀
