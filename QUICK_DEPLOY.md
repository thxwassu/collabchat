# 🚀 Quick Deploy Checklist (5 Minutes)

**Goal:** Deploy CollabChat live for FREE using Vercel + Supabase

---

## Step 1: Supabase Setup (2 min)

- [ ] Go to **https://supabase.com** → Sign up
- [ ] Create new project named `collabchat`
- [ ] Wait for project to initialize
- [ ] Go **Settings → API** and copy:
  - [ ] **Project URL** (looks like `https://xxxxx.supabase.co`)
  - [ ] **anon public key** (long string)
- [ ] Go to **SQL Editor** → Create new query
- [ ] Paste contents of `supabase/schema.sql` file
- [ ] Click **Run** and wait
- [ ] Go to **Storage** → Create 3 buckets: `avatars`, `files`, `messages` (all PUBLIC)

---

## Step 2: Push to GitHub (2 min)

```bash
cd c:\Users\ybe_wassi\Downloads\collabchat-supabase\ (1)\collabchat-supabase

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/thxwassu/collabchat.git
git push -u origin main
```

---

## Step 3: Deploy on Vercel (1 min)

- [ ] Go to **https://vercel.com** → Sign up with GitHub
- [ ] Click **Add New Project**
- [ ] Select your `collabchat` repository
- [ ] Vercel auto-detects settings ✓
- [ ] Click **Environment Variables** and add:
  ```
  VITE_SUPABASE_URL = (paste from Supabase)
  VITE_SUPABASE_ANON_KEY = (paste from Supabase)
  ```
- [ ] Click **Deploy**
- [ ] Wait 2-3 minutes...

---

## ✅ DONE!

Your app is live at: **https://collabchat-XXXXX.vercel.app**

**Next time you push to GitHub, Vercel auto-deploys!**

---

## 🆘 If Deploy Fails

1. Check build locally: `npm run build`
2. Verify env variables added in Vercel
3. Check GitHub push successful
4. Redeploy from Vercel dashboard

---

## 📖 Full Guide

See **DEPLOYMENT_GUIDE.md** for:
- Detailed instructions
- Alternative platforms (Netlify, GitHub Pages)
- Custom domain setup
- Troubleshooting
- Security tips

