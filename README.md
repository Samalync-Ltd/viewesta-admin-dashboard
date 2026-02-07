# Viewesta Admin Dashboard

Web-based React admin dashboard for managing the Viewesta premium movie streaming platform. Used by admins and content managers (separate from the mobile app).

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** (dark/light mode)
- **TanStack Query** for API state
- **Axios** for HTTP
- **React Router v7**
- **Recharts** for analytics charts
- **JWT**-based auth with role-based access

## Dev login (no backend)

When the backend is not running (e.g. 404), you can still access the dashboard with:

- **Email:** `admin@viewesta.com`  
- **Password:** `admin123`

This uses a mock Super Admin session; data pages will show loading/empty until the real API is available.

## Setup

1. **Install dependencies** (requires network and sufficient disk space):

   ```bash
   npm install --legacy-peer-deps
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set your backend API base URL:

   ```bash
   cp .env.example .env
   # Edit .env: VITE_API_BASE_URL=http://localhost:3001/api
   ```

3. **Run dev server**

   ```bash
   npm run dev
   ```

4. **Build for production**

   ```bash
   npm run build
   npm run preview
   ```

## Backend API

The dashboard expects a **real Node.js REST API**. All data comes from the backend; there is no mock data. Implement these endpoints (paths are indicative; align with your backend):

- **Auth**: `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`
- **Analytics**: `GET /analytics/overview`, `/analytics/activity/daily`, `/analytics/activity/monthly`, `/analytics/revenue-by-type`
- **Content**: `/content/movies`, `/content/genres`, `/content/categories` (CRUD)
- **Filmmakers**: `/filmmakers` (CRUD)
- **Users**: `/users` (list, get, block, unblock, grant-access)
- **Monetization**: `/monetization/plans`, `/monetization/subscriptions`, `/monetization/tvod/purchases`, `/monetization/wallet/transactions`, credit/debit
- **Reports**: `/reports` (list, get, resolve, warn, disable)
- **Notifications**: `/notifications` (send, list)
- **Settings**: `/settings`, `/settings/download-rules`
- **Ratings**: `/ratings` (list, disable/enable per content, flag abuse)

Use **JWT** in `Authorization: Bearer <token>`. Return 401 to trigger logout.

## User Roles & Permissions

| Role            | Access |
|-----------------|--------|
| **Super Admin** | Full system, admins, platform config, financials |
| **Content Admin** | Overview, movies, genres, categories, filmmakers, ratings |
| **Support**     | Overview, users, subscriptions, TVOD, reports |

Sidebar and routes are filtered by role. Protected routes redirect unauthorized users.

## Features

- **Overview**: Key metrics, daily/monthly activity, revenue by type (subscription vs TVOD), top movies and filmmakers
- **Content**: Movies & shows CRUD (metadata, poster/backdrop/trailer/streaming URLs, TVOD, subscription flag, status); Genres and Categories
- **Filmmakers**: List, search, enable/disable visibility, delete
- **Users**: List, search, block/unblock, grant access
- **Monetization**: Plans (create/edit), active subscriptions, TVOD purchases, wallet transactions
- **Downloads & DRM**: Download rules (max per user, expiration, subscription required)
- **Ratings**: List by movie, average/count/flagged
- **Reports**: List by status, type and target
- **Notifications**: Send push (title, body, target: all/subscribers/specific)
- **Settings**: Maintenance mode, default language; legal/help via backend
- **Admins**: Placeholder page (wire to your backend admin CRUD)

## Project Structure

```
src/
├── api/           # Axios client, auth, analytics, content, filmmakers, users, monetization, reports, notifications, settings, ratings
├── components/
│   ├── auth/      # LoginPage, ProtectedRoute
│   ├── layout/    # Sidebar, Header, DashboardLayout
│   └── ui/        # Toast, ToastProvider, ConfirmDialog, Pagination
├── config/        # env
├── contexts/      # AuthContext, ThemeContext
├── lib/           # rbac (permissions)
├── pages/         # Overview, Content (movies/genres/categories), Filmmakers, Users, Monetization, Downloads, Ratings, Reports, Notifications, Settings, Admins
├── types/         # auth, api, models
├── routes.tsx
├── App.tsx
└── main.tsx
```

## UX

- Confirm dialogs for destructive actions
- Toasts for success/error
- Pagination on list pages
- Search/filter where applicable
- Loading and empty states
- Responsive layout (desktop-first, tablet supported)
# viewesta-admin-dashboard
