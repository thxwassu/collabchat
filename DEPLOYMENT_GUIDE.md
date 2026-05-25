# CollabChat - Deployment Guide (FREE TOOLS)

This guide shows how to deploy CollabChat live using **100% free tools**.

---

## 📋 Overview

- **Frontend Hosting:** Vercel, Netlify, or GitHub Pages (FREE)
- **Backend:** Supabase (FREE tier)
- **Database:** Supabase Postgres (FREE tier - 500MB)
- **File Storage:** Supabase Storage (FREE tier - 1GB)

**Total Cost:** $0 (with free tier limits)

---

## 🚀 QUICK START: Deploy with Vercel (Easiest)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/collabchat.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to **https://vercel.com**
2. Click **Sign Up** → Connect GitHub account
3. Click **New Project** → Select your `collabchat` repo
4. Click **Import**
5. In **Environment Variables**, add:
   ```
   VITE_SUPABASE_URL=YOUR_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```
6. Click **Deploy**

✅ **Done!** Your app is live at `https://collabchat-XXXXX.vercel.app`

---

## 🔧 STEP-BY-STEP DEPLOYMENT

### A. Prepare Your Project (DO THIS FIRST)

#### 1. Create `.env.production` file:
```bash
# In project root, create file: .env.production
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### 2. Build locally to verify:
```bash
npm run build
```
Check output in `dist/` folder.

#### 3. Verify `.gitignore` includes:
```
node_modules/
.env
.env.local
dist/
```

#### 4. Commit changes:
```bash
git add .
git commit -m "Prepare for deployment"
git push
```

---

### B. Setup Supabase (FREE Backend)

#### 1. Go to **https://supabase.com**

#### 2. Sign Up with GitHub/Google

#### 3. Create New Project:
   - Project name: `collabchat`
   - Region: Pick closest to you
   - Password: Save it securely
   - Click **Create New Project** (wait 2-3 minutes)

#### 4. Get Your Credentials:
   - Click **Settings** → **API**
   - Copy:
     - **Project URL** → `VITE_SUPABASE_URL`
     - **anon public** key → `VITE_SUPABASE_ANON_KEY`

#### 5. Initialize Database:
   - Go to **SQL Editor**
   - Click **New Query**
   - Paste contents of `supabase/schema.sql`
   - Click **Run**
   - Wait for completion ✓

#### 6. Create Storage Buckets:
   - Go to **Storage**
   - Create bucket named: `avatars` (public)
   - Create bucket named: `files` (public)
   - Create bucket named: `messages` (public)

---

### C. Deploy with VERCEL (Recommended)

#### 1. Create GitHub Repository:
   ```bash
   # From project directory
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/collabchat.git
   git push -u origin main
   ```

#### 2. Go to **https://vercel.com**

#### 3. Sign In with GitHub

#### 4. Click **Add New Project** → **Import Git Repository**

#### 5. Select your `collabchat` repository

#### 6. Configure Project:
   - **Framework Preset:** Vite ✓
   - **Build Command:** `npm run build` ✓
   - **Output Directory:** `dist` ✓

#### 7. Add Environment Variables:
   ```
   VITE_SUPABASE_URL = https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY = your-supabase-anon-key
   ```

#### 8. Click **Deploy**

✅ **Live at:** `https://collabchat-XXXXX.vercel.app`

**Every push to `main` branch auto-deploys!**

---

### D. Alternative: Deploy with NETLIFY

#### 1. Create GitHub Repo (same as Vercel Step 1)

#### 2. Go to **https://netlify.com**

#### 3. Sign In with GitHub

#### 4. Click **Add New Site** → **Import an existing project**

#### 5. Authorize GitHub → Select `collabchat` repo

#### 6. Configure Build Settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`

#### 7. Click **Advanced** → **New variable**
   ```
   Key: VITE_SUPABASE_URL
   Value: https://your-project-ref.supabase.co
   
   Key: VITE_SUPABASE_ANON_KEY
   Value: your-supabase-anon-key
   ```

#### 8. Click **Deploy Site**

✅ **Live at:** `https://collabchat-XXXXX.netlify.app`

---

### E. Alternative: Deploy with GITHUB PAGES

#### 1. Create GitHub Repo (same as Vercel Step 1)

#### 2. Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

#### 3. Add Secrets:
   - Go to **GitHub Repo Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

#### 4. Push to main branch - auto-deploys!

✅ **Live at:** `https://YOUR_USERNAME.github.io/collabchat/`

---

## 🌐 Setup Custom Domain (All Platforms Support This)

### For Vercel:
1. Go to **Project Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain
4. Follow DNS instructions
5. Wait 5-30 minutes for SSL cert

### For Netlify:
1. Go to **Site Settings** → **Domain Management**
2. Click **Add Custom Domain**
3. Enter your domain
4. Follow DNS instructions

### For GitHub Pages:
1. Go to **Repo Settings** → **Pages**
2. Under **Custom domain**, enter your domain
3. Update DNS records

---

## 📱 MONITOR YOUR DEPLOYMENT

### Vercel Analytics Dashboard:
- Response time
- Traffic
- Deployments
- Errors

### Netlify Analytics:
- Real-time logs
- Build history
- Deployment status

### Supabase Dashboard:
- Database queries
- Storage usage
- Active users
- API requests

---

## ⚠️ TROUBLESHOOTING

### "Build Failed" Error
```bash
# Verify locally
npm run build

# Check for errors
npm run dev
```

### Environment Variables Not Loading
- Verify variable names start with `VITE_`
- Redeploy after adding variables
- Check `.env.production` file exists

### Supabase Connection Issues
- Verify `VITE_SUPABASE_URL` is correct
- Verify `VITE_SUPABASE_ANON_KEY` is correct
- Check storage bucket names are correct
- Verify Row Level Security policies are set

### Files Won't Upload
- Check bucket names in `supabaseClient.js`
- Verify buckets are set to PUBLIC in Supabase
- Check file size < 10MB

### CORS Errors
- In Supabase → **Settings** → **API**
- Add your domain to **CORS Allowed Origins**:
  ```
  https://your-domain.com
  https://collabchat-XXXXX.vercel.app
  ```

---

## 💡 FREE TIER LIMITS

| Resource | Free Limit |
|----------|-----------|
| Supabase Database | 500 MB |
| Supabase Storage | 1 GB |
| Supabase Monthly Active Users | Unlimited |
| Vercel Deployments | Unlimited |
| Vercel Bandwidth | 100 GB/month |
| Netlify Bandwidth | 100 GB/month |
| GitHub Pages | Unlimited |

**Tip:** If you exceed limits, upgrade to paid plan (~$10-20/month)

---

## 🔐 SECURITY CHECKLIST

- [ ] Never commit `.env` file
- [ ] Use `VITE_` prefix for public env vars only
- [ ] Enable Row Level Security in Supabase
- [ ] Set storage buckets to PUBLIC (not private)
- [ ] Enable authentication on all tables
- [ ] Use strong password for Supabase
- [ ] Enable 2FA on GitHub/Vercel/Netlify

---

## 📞 SUPPORT & RESOURCES

- **Vercel Docs:** https://vercel.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **Supabase Docs:** https://supabase.com/docs
- **Vite Docs:** https://vitejs.dev/guide/

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Supabase project created
- [ ] Database schema imported
- [ ] Storage buckets created
- [ ] GitHub repo created & pushed
- [ ] Deployment platform configured
- [ ] Environment variables added
- [ ] Deploy triggered
- [ ] App loads at public URL
- [ ] Authentication works
- [ ] File upload works
- [ ] Real-time features work
- [ ] Custom domain set (optional)

---

**Happy Deploying! 🚀**
