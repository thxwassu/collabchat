# CollabChat — Real-Time Chat and Team Collaboration Platform

CollabChat is a complete Web Engineering final semester project rebuilt with an online backend. It does **not** require local MongoDB.

This version uses:

- **Frontend:** HTML5, CSS3, JavaScript ES Modules, Vite
- **Online Backend:** Supabase
- **Database:** Supabase Postgres
- **Authentication:** Supabase Auth with email/password
- **Realtime:** Supabase Realtime subscriptions and presence channels
- **File Storage:** Supabase Storage buckets
- **Security:** Row Level Security policies in SQL

---

## Features

### Public Website

- Home page
- About page
- Features page
- Contact page
- Login page
- Register page
- Professional navigation and footer
- Responsive landing design

### Authentication

- User registration
- User login
- Admin login
- Logout
- Profile management
- Avatar upload
- Password update
- Disabled-user protection
- Admin role check

### User Dashboard

- Joined workspace count
- Recent tasks
- Recent messages
- Online users
- Notification overview
- Quick navigation cards

### Workspace System

- Create workspace
- Auto-generated invite code
- Join workspace by invite code
- Default rooms created automatically:
  - General
  - Announcements
  - Frontend
  - Backend
- Workspace members list
- Workspace details page
- Leave or delete workspace depending on role

### Room and Group Chat

- Workspace room list
- Real-time messages
- Message history saved in Supabase Postgres
- Sender name and avatar
- Image/file sharing
- File download links
- Message editing
- Message deleting/hiding
- Message pinning
- Typing indicator using realtime broadcast
- Presence count using realtime presence
- Message search

### Private Chat

- Search/contact workspace members
- One-to-one private messages
- Realtime private message updates
- Seen status
- Private file sharing
- Private message notifications

### File Sharing

- Upload images, PDFs, Word, Excel, ZIP, TXT
- 10 MB validation limit
- Supabase Storage public URLs
- Uploaded files table
- File search
- Admin file management

### Task Collaboration

- Create tasks
- Assign tasks to workspace members
- Priority: Low, Medium, High
- Status: Pending, In Progress, Completed
- Due dates
- Status board
- Realtime task updates
- Task notifications

### Notifications

- New task assigned
- Private messages
- File uploaded
- Workspace activity
- Read/unread status
- Mark all read

### Admin Panel

- Admin login
- Admin dashboard
- Total users
- Total workspaces
- Total messages
- Total tasks
- Manage users
- Disable/enable users
- Promote/demote admin role
- Manage workspaces
- Manage contact messages
- Manage chat messages
- Manage uploaded files

> Note: In a browser-only Supabase app, deleting users from `auth.users` requires a secure server, Edge Function, or service-role key. This project implements safe **soft disable** from the admin panel. Disabled users cannot continue after login.

---

## Folder Structure

```text
collabchat-supabase/
├── index.html
├── about.html
├── features.html
├── contact.html
├── login.html
├── register.html
├── dashboard.html
├── workspaces.html
├── workspace.html
├── chat.html
├── private-chat.html
├── tasks.html
├── files.html
├── notifications.html
├── profile.html
│
├── admin/
│   ├── login.html
│   ├── dashboard.html
│   ├── users.html
│   ├── workspaces.html
│   ├── messages.html
│   └── files.html
│
├── src/
│   ├── css/
│   │   ├── style.css
│   │   ├── auth.css
│   │   ├── dashboard.css
│   │   └── admin.css
│   │
│   └── js/
│       ├── supabaseClient.js
│       ├── ui.js
│       ├── main.js
│       ├── auth.js
│       ├── dashboard.js
│       ├── workspaces.js
│       ├── chat.js
│       ├── private-chat.js
│       ├── tasks.js
│       ├── files.js
│       ├── notifications.js
│       ├── profile.js
│       └── admin.js
│
├── supabase/
│   └── schema.sql
│
├── package.json
├── .env.example
└── README.md
```

---

## Step 1: Create Supabase Project

1. Open Supabase.
2. Create a new project.
3. Save your project password somewhere safe.
4. Wait until the project is ready.

---

## Step 2: Enable Email Authentication

In Supabase dashboard:

1. Go to **Authentication**.
2. Open **Providers**.
3. Enable **Email** provider.
4. For classroom testing, disable **Confirm email** so login works immediately after registration.

---

## Step 3: Run Database SQL

1. Go to Supabase dashboard.
2. Open **SQL Editor**.
3. Open this project file:

```text
supabase/schema.sql
```

4. Copy the full SQL.
5. Paste it into SQL Editor.
6. Click **Run**.

This creates:

- Database tables
- Relationships
- Row Level Security policies
- Storage buckets
- Realtime table publication

---

## Step 4: Configure Environment

Copy the example env file:

```bash
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Open `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can find these in Supabase:

```text
Project Settings → API → Project URL and anon public key
```

---

## Step 5: Install and Run

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

---

## Step 6: Create Admin Account

1. Open:

```text
http://localhost:3000/register.html
```

2. Register:

```text
Email: admin@collabchat.com
Password: admin123
```

3. Go to Supabase SQL Editor.
4. Run:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@collabchat.com';
```

5. Open:

```text
http://localhost:3000/admin/login.html
```

6. Login with:

```text
Email: admin@collabchat.com
Password: admin123
```

---

## Common Fixes

### Error: Supabase is not configured

You did not create `.env` or did not paste the correct URL/key.

Fix:

```bash
copy .env.example .env
```

Then edit `.env`.

### Login says email not confirmed

In Supabase dashboard, disable email confirmation for testing:

```text
Authentication → Providers → Email → Confirm email OFF
```

### Storage upload fails

Check that the SQL created these buckets:

- `collab-files`
- `avatars`

Also check that storage policies were created successfully.

### Realtime not updating

Open Supabase:

```text
Database → Replication
```

Make sure these tables are enabled for realtime:

- messages
- private_messages
- tasks
- notifications
- workspace_members
- uploaded_files

The SQL attempts to add them automatically.

---

## Testing Flow

1. Register two normal users.
2. Create a workspace from User 1.
3. Copy invite code.
4. Login as User 2 in another browser/incognito window.
5. Join workspace using invite code.
6. Open chat in both browsers.
7. Send messages and check realtime updates.
8. Upload files.
9. Create tasks and assign them.
10. Login as admin and view platform data.

---

## Future Enhancements

- Supabase Edge Function for hard user deletion
- Email notifications
- Advanced report system
- Message emoji reactions table
- Voice/video calls
- Calendar integration
- Workspace roles and permission editor
- Export reports as PDF

---

## Project Status

This project is designed to be suitable for a final semester Web Engineering submission. It includes all required pages, database schema, online backend setup, professional UI, and real-time features.
