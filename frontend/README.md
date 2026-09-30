# Next World Frontend

This is the React app for the Next World Collective website. It contains both the public site (home, events, about us) and the admin dashboard where the team manages content.

- **Production:** https://www.nxtworld.co, hosted on [Vercel](#deployment-vercel)
- **Stack:** React 19, Vite 6, Tailwind CSS 4, React Router 7, TanStack Query 5, react-hook-form, axios

It gets all of its content from the [backend API](../backend/README.md). The [root README](../README.md) shows how the two fit together.

---

## Contents

- [Running the dev server](#running-the-dev-server)
- [Sharing a preview with `start.sh`](#sharing-a-preview-with-startsh)
- [How the code is organised](#how-the-code-is-organised)
- [Pages and routes](#pages-and-routes)
- [Components](#components)
- [Talking to the API](#talking-to-the-api)
- [Admin login](#admin-login)
- [Deployment (Vercel)](#deployment-vercel)
- [Known leftovers](#known-leftovers)

---

## Running the dev server

```bash
cp .env.example .env    # set VITE_API_BASE_URL (see below)
npm install
npm run dev             # http://localhost:5173
```

The only environment variable is:

| Variable | Example | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | Base URL of the backend, **with no trailing slash** |

Vite only reads `.env` when it starts, so **restart `npm run dev` after changing it**. Keep in mind that any `VITE_` variable is built into the public JavaScript bundle, so never put secrets in one.

For content to load, you also need the backend running (`cd ../backend && npm run dev`). Its `ALLOWED_ORIGINS` has to include `http://localhost:5173`, which is the default when the variable isn't set.

| Script | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server with hot reload |
| `npm run build` | Builds the production bundle into `dist/` |
| `npm run preview` | Serves the built `dist/` locally |
| `npm run lint` | Runs ESLint |

## Sharing a preview with `start.sh`

[`../start.sh`](../start.sh) runs the **whole site on your machine** and gives it a **public HTTPS link through ngrok**. Use it to show work in progress to someone who isn't on your network, like a client or a teammate, without deploying anything.

```bash
# from the repo root
./start.sh
```

When everything is ready, it prints:

```
========================================
 Preview ready — share this link:
 https://<something>.ngrok-free.app
========================================
```

Press **Ctrl+C** to stop. Everything is shut down and put back the way it was.

### What it does, step by step

1. **Checks the tools** it needs: `ngrok`, `curl`, `lsof`, `npm` and `python3`.
2. **Backs up** `frontend/.env` and `backend/.env` to temporary files.
3. **Starts one ngrok agent with two tunnels:**
   - `frontend`, pointing at port **5173** (Vite)
   - `backend`, pointing at port **3000** (Express)

   It stops any ngrok that was already running first.
4. **Gets the two public HTTPS URLs** from ngrok's local API (`http://127.0.0.1:4040/api/tunnels`).
5. **Points the two apps at each other:**
   - `frontend/.env` gets `VITE_API_BASE_URL=<backend tunnel URL>`
   - `backend/.env` gets `ALLOWED_ORIGINS=<frontend tunnel URL>,http://localhost:5173`
6. **Restarts both apps** so they pick up the new values:
   - it stops whatever is listening on ports 5173 and 3000,
   - starts `npm run dev` in `backend/`,
   - starts `npm run dev -- --host` in `frontend/`,
   - waits until both ports are listening.
7. **Prints the link** to share, then keeps running and watches ngrok.
8. **Cleans up when you stop it** (Ctrl+C or any error): it stops the three processes, frees both ports, and puts both `.env` files back. If a `.env` didn't exist before, the file the script created is deleted.

Two small code changes make the tunnels work:

- [`vite.config.js`](vite.config.js) allows `.ngrok-free.app` and `.ngrok.io` hosts. Without that, Vite blocks unknown hostnames.
- [`src/api/axios.js`](src/api/axios.js) sends the `ngrok-skip-browser-warning` header when the API URL contains `ngrok`. Without it, free ngrok returns its HTML warning page instead of your API's JSON.

### Before your first run

- **Install ngrok** and add your authtoken once: `ngrok config add-authtoken <token>`.
- **Have both `.env` files ready**, with everything filled in except the values the script sets. The backend still needs its database, JWT, email and AWS settings.
- **Have local Postgres running**, since the backend uses it.

### Good to know

- **The script needs two ngrok tunnels at once.** If your ngrok plan only allows one, the script stops with "Could not get ngrok HTTPS URLs".
- **Logs** are written to `/tmp/frontend-preview.log`, `/tmp/backend-preview.log` and `/tmp/ngrok-preview.log`.
- **Ports can be changed**, e.g. `FRONTEND_PORT=5174 BACKEND_PORT=3001 ./start.sh`.
- **If the script is force-killed** (`kill -9`, or the terminal crashes), the cleanup doesn't run, and your `.env` files are left pointing at the old ngrok URLs. Fix them by hand if that happens.
- **Admin login over the preview** may not work in production mode, because the frontend and backend tunnels count as different sites for the refresh cookie. It works when the backend has `NODE_ENV=development`, which makes the cookie `sameSite: lax`.

---

## How the code is organised

```
src/
├── main.jsx            mounts <App /> into index.html
├── App.jsx             router + TanStack Query client
├── App.css             global styles, fonts, animations
├── api/axios.js        the shared axios instance (base URL = VITE_API_BASE_URL)
├── context/            AuthContext: admin access token + login state
├── layouts/            page shells (header/footer) wrapping the routes
├── pages/              one component per route
│   └── admin/          login, forgot/reset password, dashboard
├── components/         building blocks for the public pages
│   ├── admin/          dashboard sections, lists, forms, buttons
│   └── ui/             small reusable styled elements (Button, Input, Form…)
├── hooks/              wrappers around TanStack Query & react-hook-form
├── services/           one file per API resource; all HTTP calls live here
├── validators/         shared react-hook-form validation rules
├── utils/              helpers (date formatting)
└── assets/             images, videos, logos, team photos
```

Data flows through the layers in one direction:

```
page → component → hook (useFetch / useCreate / useEdit / useDelete) → service → api (axios) → backend
```

## Pages and routes

Routes are defined in [`App.jsx`](src/App.jsx).

| Path | Page | What's on it |
|---|---|---|
| `/`, `/home` | `HomePage` → `MainPage` | Hero video, "who are we", press articles, and the contact form |
| `/events` | `EventsPage` → `EventsMedia` | Hero video, upcoming events, and past events |
| `/about-us` | `AboutUs` → `AboutUsComponent` | Mission section, plus the **Executive Team** (`exec`) and **Major Contributors** (`other`) member grids |
| `/gallery` | `Gallery` → `PhotoWall` | **Turned off.** The route and its nav link are commented out |
| `/admin`, `/admin/login` | `AdminLogin` | Admin login form |
| `/admin/forgot-password` | `ForgotPasswordRequest` | Asks for an email and sends a reset link |
| `/admin/reset-password?token=…` | `ResetPassword` | Sets a new password using the token from the email |
| `/admin/dashboard` | `AdminDashboard` (inside `AdminValidator`) | Content management; you're redirected to `/admin` if not logged in |

There are two layouts:
- [`MainLayout`](src/layouts/MainLayout.jsx) wraps every page with `MainHeader`, the `EasterEgg` modal, and `MainFooter`.
- [`AdminLayout`](src/layouts/AdminLayout.jsx) is the same, but also wrapped in `AuthProvider`, so only admin routes know about login state.

## Components

### Public site ([`src/components/`](src/components/))

| Component | What it does |
|---|---|
| `MainHeader`, `Navbar` | Top bar with the logo and links to Home, Events and About Us |
| `MainFooter` | Social links (email, Instagram, TikTok, YouTube) |
| `MainPage` | The home page's content |
| `ArticlesContainer` → `ArticleCard` | Fetches `/articles` and shows press cards |
| `ContactForm` | Contact form. Sends to `POST /inquiries`, which emails the team |
| `EventsMedia` | The events page layout |
| `UpcomingEventsContainer` → `UpcomingEventCard` | Fetches `/upcoming-events` and shows each flyer, date and ticket link |
| `PastEventsContainer` → `PastEventCard` | Fetches `/past-events` and shows each flyer, details and artists |
| `AboutUsComponent` | The about page layout |
| `MembersContainer` → `Staff` | Fetches `/members/:type` and shows a grid of member cards; clicking one opens a pop-up with details |
| `FadeInOnScroll` | Fades its content in when it scrolls into view |
| `PhotoWall` | Masonry photo gallery built from `assets/carousel-gallery/`, used by the disabled Gallery page |
| `EasterEgg` | A hidden developer-credits pop-up. Type `d` `e` `v`, or the Konami code |

### Admin dashboard ([`src/components/admin/`](src/components/admin/))

[`AdminDashboard`](src/pages/admin/AdminDashboard.jsx) has four **sections**: Articles, Upcoming Events, Past Events and Members. They all follow the same pattern:

```
XAdminSection            holds "which item is being edited" (useEditState)
├── XForm                create/edit form (useCreateEditForm + useCreate/useEdit)
└── XAdminList           list of items (useFetch) with edit/delete buttons (useDelete)
    └── ItemsList → ItemCard → EditButton / DeleteButton
```

- **Edit** on an item fills the form with that item. Clicking **Edit** again on the same item clears the form.
- **Submitting** calls the create or edit service. After it succeeds, the list's cached data is marked stale, so the list reloads.
- **Forms with images** (events and members) upload the file to S3 first, then save the item. See [Talking to the API](#talking-to-the-api).
- [`AdminValidator`](src/components/admin/AdminValidator.jsx) guards the dashboard. It shows "Loading…" while the login check runs, and sends you to `/admin` if you're not logged in.

### UI kit ([`src/components/ui/`](src/components/ui/))

Small styled building blocks shared across the site: `Button`, `Input`, `Select`, `Form`, `H3`, `Anchor` (external link), `ErrorMessage`, `InfoMessage`, `Loading` and `LoadingSpinner`.

---

## Talking to the API

**Every request goes through [`src/api/axios.js`](src/api/axios.js).** It's one axios instance whose `baseURL` is `VITE_API_BASE_URL`. When an admin is logged in, `AuthContext` automatically adds `Authorization: Bearer <accessToken>` to each request.

**Services** ([`src/services/`](src/services/)) hold one function per API call:

| Service | Endpoints |
|---|---|
| `articlesService` | `/articles` |
| `upcomingEventsService` | `/upcoming-events` (and the flyer upload) |
| `pastEventsService` | `/past-events` (and the flyer upload) |
| `membersService` | `/members` (and the photo upload) |
| `inquiriesService` | `/inquiries` |
| `authService` | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password` |
| `s3Service` | `/uploads/presign` and `/uploads`, plus the direct `PUT` to S3 |

**Hooks** ([`src/hooks/`](src/hooks/)) connect the services to TanStack Query:

| Hook | What it does |
|---|---|
| `useFetch({ queryFn, queryKey })` | `useQuery`. Results are cached for 10 minutes and aren't refetched when the window regains focus (set in `App.jsx`) |
| `useCreate` / `useEdit` / `useDelete` | `useMutation`, plus marking `queryKey` stale on success so lists refresh |
| `useCreateEditForm` | react-hook-form setup for one form that handles both creating and editing |
| `useEditState` | Tracks which item is currently being edited |

**Image uploads** (in the `*WithImage` service functions) work like this:
1. `getPresignedUrl(folder, fileName, contentType)` asks the backend for a signed URL.
2. `uploadImageToS3(presignedUrl, file)` uploads the file straight to S3 with plain axios, which doesn't add the auth header.
3. The item is saved with `flyerUrl` or `photoUrl` set to the presigned URL minus its `?query`.

When an image is replaced during an edit, the old one is deleted from S3 first.

---

## Admin login

The login state lives in [`AuthContext`](src/context/AuthContext.jsx):

1. **Logging in:** `AdminLogin` calls `POST /auth/login`. The backend returns an **access token**, which is kept only in React state, and sets an `httpOnly` **refresh-token cookie**.
2. **Reloading the page:** `AuthProvider` calls `POST /auth/refresh` with `withCredentials: true`. If the cookie is still valid, you get a new access token and stay logged in.
3. **Logging out:** the dashboard calls `DELETE /auth/logout`, which revokes the refresh token, and clears the local login state.

The refresh cookie is `sameSite: strict` in production. So login only lasts across page reloads when the site and the API share a domain (`www.nxtworld.co` and `api.nxtworld.co`).

Admin accounts are created on the backend. See [Adding admin users](../backend/README.md#adding-admin-users).

---

## Deployment (Vercel)

- **The Vercel project uses `frontend/` as its root directory.** Vercel detects Vite, runs `npm run build`, and serves `dist/`.
- **Every push to `main` deploys to production**, and other branches get preview deployments.
- **[`vercel.json`](vercel.json) sends every path to `index.html`**, so refreshing on a page like `/events` or `/admin/dashboard` works.
- **Set this in the project's environment variables:** `VITE_API_BASE_URL=https://api.nxtworld.co`.
  - After changing it, **redeploy**, because Vite builds the value into the bundle at build time.
- **Domains:** `www.nxtworld.co` is the main domain, and `nxtworld.co` redirects to it. DNS is at Porkbun.
- **Adding another domain** (or using a preview URL against the production API) also means adding its origin to the backend's `ALLOWED_ORIGINS`.

---

## Known leftovers

These don't break anything, but they're worth knowing about when you're working in the code:

- **The Gallery page is turned off** in `App.jsx` and `Navbar.jsx`. Fix these before turning it back on:
  - `PhotoWall` builds its image paths as `nextworld-carousel-1-min.jpg` through `-89-min.jpg`, but there's no photo 2.
  - Photo 90 is never included.
  - 10 of the images end in `.JPG`. That's fine on macOS, which ignores upper/lower case, but it fails on case-sensitive servers like Vercel's build machines.

  Renaming the files to a clean `1…N` sequence with `.jpg` fixes all three.
- **Some files aren't used by anything:**
  - `pages/NotFound.jsx`: there's no catch-all route, so unknown URLs show React Router's default "404 Not Found" error screen instead.
  - `components/EmailUs.jsx`
  - `components/ui/Link.jsx`: the file is empty.
  - `components/admin/ArticleCard.jsx`: it imports files that don't exist, so it would break if anything used it.
- **Cache names differ between the public pages and the dashboard.** The public pages use `['upcoming-events']` and `['past-events']`, and the admin lists use `['upcomingEvents']` and `['pastEvents']`. So an edit made in the dashboard won't show on the public pages in the same tab until their 10-minute cache expires or you reload.
- **`@mui/material` and `@mui/icons-material` are installed but not imported anywhere.**
