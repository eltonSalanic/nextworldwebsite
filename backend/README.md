# Next World Backend (API)

This is the REST API behind the Next World website. It stores articles, events and members in PostgreSQL, logs admins in, signs S3 upload URLs for images, and sends email through Gmail.

- **Production:** https://api.nxtworld.co, hosted on [Railway](#deployment-railway)
- **Stack:** Node.js, Express 5, PostgreSQL (`pg`), JWT (`jose`), `bcrypt`, AWS SDK v3 (S3), `nodemailer`

For how this fits together with the frontend, see the [root README](../README.md).

---

## Contents

- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [How the code is organised](#how-the-code-is-organised)
- [API reference](#api-reference)
- [Authentication](#authentication)
- [Image uploads (S3)](#image-uploads-s3)
- [Database](#database)
- [Deployment (Railway)](#deployment-railway)
- [Adding admin users](#adding-admin-users)
- [Troubleshooting](#troubleshooting)

---

## Running locally

```bash
cp .env.example .env    # fill in the values (see below)
npm install
psql -d nxtworldcollective -f database.sql   # once, to create the tables
npm run create-admin -- you@example.com      # once, to be able to log in
npm run dev             # starts nodemon on SERVER_PORT (default 3000)
```

| Script | What it does |
|---|---|
| `npm run dev` | Starts the server with nodemon, which restarts it whenever a file changes |
| `npm start` | Starts the server with plain `node`. Railway uses this |
| `npm run create-admin -- <email>` | Creates an admin user. See [Adding admin users](#adding-admin-users) |

If you use Postgres.app and `psql` isn't on your `PATH`, run it as `/Applications/Postgres.app/Contents/Versions/latest/bin/psql`.

## Environment variables

Every variable is listed in [`.env.example`](.env.example). Copy it to `.env` for local development, and set the same names in Railway for production.

| Variable | Used for |
|---|---|
| `PORT` / `SERVER_PORT` | The port to listen on. Railway sets `PORT`; locally the server falls back to `SERVER_PORT` |
| `NODE_ENV` | `development` or `production`. `production` turns on secure cookies with `sameSite: strict`, `https` reset links, rejects requests with no `Origin`, and hides error details in responses |
| `ALLOWED_ORIGINS` | Comma-separated list of frontend origins CORS accepts, e.g. `https://www.nxtworld.co,https://nxtworld.co` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection |
| `JWT_SECRET` | Secret used to sign access tokens. Use a long random value, e.g. from `openssl rand -hex 64` |
| `ACCESS_EXPIRY_MINUTES` | How long an access token is valid (e.g. `15`) |
| `REFRESH_EXPIRY_DAYS` | How long a refresh token and its cookie are valid (e.g. `7`) |
| `SALT_ROUNDS` | bcrypt cost factor for password hashing (e.g. `10`–`12`) |
| `FRONTEND_PASSWORD_RESET_URL` | The reset page **without** `http(s)://`, e.g. `www.nxtworld.co/admin/reset-password`. The protocol is added based on `NODE_ENV` |
| `FROM_EMAIL` | Gmail address that sends reset emails **and** receives contact-form messages |
| `EMAIL_PASS` | A Gmail **App Password** for `FROM_EMAIL`, not the normal account password |
| `AWS_S3_REGION`, `AWS_ACCESS_KEY`, `AWS_SECRET_ACCESS_KEY`, `AWS_IMAGE_BUCKET` | S3 access for image uploads and deletes. Production uses bucket `nxtworld` in `us-east-1` |

## How the code is organised

Each request passes through the same layers, from top to bottom:

```
request → routes/ → middlewares/ (auth) → controllers/ → services/ → repositories/ → PostgreSQL
                                                              ↘ uploadsService / emailService → S3 / Gmail
errors thrown anywhere → middlewares/errorHandler.js → JSON error response
```

| Folder / file | What it does |
|---|---|
| [`server.js`](server.js) | Entry point. Sets up CORS, the JSON body parser and cookie parser, mounts each router, and adds the error handler at the end |
| [`config/cors.js`](config/cors.js) | Only allows origins listed in `ALLOWED_ORIGINS`, with credentials (cookies) enabled. In production it also rejects requests that have no `Origin` header |
| [`routes/`](routes/) | One file per resource. Maps URLs to controller functions, and adds `authenticateAdminUser` on routes that change data |
| [`middlewares/authenticateAdminUser.js`](middlewares/authenticateAdminUser.js) | Checks the `Authorization: Bearer <jwt>` header. Responds 401 if the token is missing, expired or invalid |
| [`middlewares/errorHandler.js`](middlewares/errorHandler.js) | Catches every error, logs it with its `cause`, and returns `{ error: { message, statusCode } }`. Only errors marked `isOperational` show their real message; in development the stack trace is included too |
| [`controllers/`](controllers/) | Read the request's body, params and query, call a service, and send the response. They have no `try/catch` because Express 5 automatically passes errors from `async` handlers to the error handler |
| [`services/`](services/) | Business logic: login and token rotation (`authService`), member-type checks (`membersService`), S3 presigning and deletes (`uploadsService`), and email (`emailService`). Most other services just pass through to a repository |
| [`repositories/`](repositories/) | All the SQL. Each function runs parameterised queries through the shared pool in [`pool.js`](repositories/pool.js), and wraps any database failure in a `DatabaseError`. Deletes that also remove an S3 image run inside a transaction |
| [`errors/`](errors/) | `AppError` is the base class, with `statusCode` and `isOperational`. `AuthError`, `DatabaseError` and `EmailError` extend it |
| [`models/`](models/) | Classes that document each table's shape. They're for reference only and aren't used at runtime |
| [`scripts/createAdmin.js`](scripts/createAdmin.js) | Command-line tool that creates an admin user |
| [`database.sql`](database.sql) | Creates every table (generated with pgAdmin) |

### Resources

| Resource | Table(s) | Notes |
|---|---|---|
| Articles | `articles` | Press coverage: title, source, date, description, and an external link. No image |
| Upcoming events | `upcoming_events` | Title, date (stored in `subtitle`), ticket link (stored in `url`), and a flyer image (`flyer_url`) |
| Past events | `past_events`, `artists`, `past_events_artists` | Each event has a flyer, title, date, description, place, and a list of artists. Artists are matched by `contact`, so the same person is reused across events, and artists left with no events are deleted along with the event |
| Members | `members` | Team members, with `type` set to `exec` (Executive Team) or `other` (Major Contributors) |
| Inquiries | none | The contact form. Messages are emailed to `FROM_EMAIL`, not stored |
| Admin auth | `admin_users`, `refresh_tokens`, `reset_tokens` | Admin logins and their tokens |

Deleting an upcoming event, past event or member also deletes its image from S3.

## API reference

🔒 means the route needs `Authorization: Bearer <accessToken>`.

| Method | Path | Body / params | Description |
|---|---|---|---|
| `POST` | `/auth/login` | `{ email, password }` | Returns `{ accessToken, expiresAt }` and sets the `refreshToken` cookie. The refresh token never appears in the response body |
| `POST` | `/auth/refresh` | cookie `refreshToken` | Rotates the refresh token (new cookie) and returns `{ accessToken, expiresAt }` |
| `DELETE` | `/auth/logout` | cookie `refreshToken` | Revokes the refresh token and clears the cookie |
| `POST` | `/auth/forgot-password` | `{ email }` | Emails a reset link, valid for 1 hour. Always returns 200, so nobody can use it to check which emails are admins |
| `POST` | `/auth/reset-password` | `{ token, newPassword }` | Sets a new password using the token from the email |
| `GET` | `/articles` | | List articles |
| `POST` 🔒 | `/articles` | `{ title, source, date, description, link }` | Create an article |
| `PUT` 🔒 | `/articles/:id` | same as create | Update an article |
| `DELETE` 🔒 | `/articles/:id` | | Delete an article |
| `GET` | `/upcoming-events` | | List upcoming events |
| `POST` 🔒 | `/upcoming-events` | `{ title, date, ticketLink, flyerUrl }` | Create an upcoming event |
| `PUT` 🔒 | `/upcoming-events/:id` | same as create | Update an upcoming event |
| `DELETE` 🔒 | `/upcoming-events/:id` | | Delete the event and its flyer in S3 |
| `GET` | `/past-events` | | List past events with their artists |
| `POST` 🔒 | `/past-events` | `{ flyerUrl, title, date, description, place, artists: [{ name, contact }] }` | Create a past event |
| `PUT` 🔒 | `/past-events/:id` | same as create | Update a past event |
| `DELETE` 🔒 | `/past-events/:id` | | Delete the event, its flyer, and any artists left with no events |
| `GET` | `/members` | | List all members |
| `GET` | `/members/:type` | `type` = `exec` or `other` | List members of one type |
| `POST` 🔒 | `/members` | `{ firstName, lastName, role, photoUrl, description, funFact, type }` | Create a member |
| `PUT` 🔒 | `/members/:id` | same as create | Update a member |
| `DELETE` 🔒 | `/members/:id` | | Delete the member and their photo in S3 |
| `POST` | `/inquiries` | `{ firstName, lastName, userEmail, inquiryBody }` | Email a contact-form message to the team |
| `GET` 🔒 | `/uploads/presign` | query `folder`, `fileName`, `contentType` | Returns `{ presignedUrl }`, which is valid for 60 seconds |
| `DELETE` 🔒 | `/uploads` | query `fileUrl` | Delete an image from S3 by its URL |

Errors always come back in this shape: `{ "error": { "message": "...", "statusCode": 500 } }`.

## Authentication

- **Passwords** are hashed with bcrypt (`SALT_ROUNDS`) and stored in `admin_users.password`.
- **Access token:** a JWT signed with `JWT_SECRET` (HS256). It holds the admin's email, has the admin's ID as its `sub`, and expires after `ACCESS_EXPIRY_MINUTES`. The frontend keeps it only in memory.
- **Refresh token:** 64 random bytes, stored in the `refresh_tokens` table and in an `httpOnly` cookie. It's only ever sent in the cookie, never in a response body, so frontend JavaScript can't read it. Every call to `/auth/refresh` deletes the old token and issues a new one (token rotation).
- **Password reset:**
  1. `/auth/forgot-password` creates a token in `reset_tokens` that expires after 1 hour, and emails the link `http(s)://FRONTEND_PASSWORD_RESET_URL?token=...`.
  2. `/auth/reset-password` checks the token, saves the new password, and deletes the token.
- **Cookies** use `secure` and `sameSite: strict` in production. That works only because the frontend (`www.nxtworld.co`) and API (`api.nxtworld.co`) are on the same site.

## Image uploads (S3)

The API never receives the image files. It only signs uploads and deletes images.

1. The admin dashboard calls `GET /uploads/presign?folder=upcoming-events/&fileName=flyer.png&contentType=image/png`.
2. [`uploadsService.generatePresignedUrl`](services/uploadsService.js) builds a key from the folder, 32 random hex characters and the file's extension (e.g. `upcoming-events/f38a…57.png`), and returns a `PUT` URL that's valid for 60 seconds.
3. The browser uploads the file straight to S3. The frontend then stores the URL without its `?query` part (e.g. `https://nxtworld.s3.us-east-1.amazonaws.com/upcoming-events/f38a…57.png`) in the database item.

The bucket uses three folders: `upcoming-events/`, `past-events/` and `members/`. The original file name isn't kept, so the images can't be matched to their items from the bucket alone.

## Database

[`database.sql`](database.sql) creates these tables:

| Table | Columns |
|---|---|
| `admin_users` | `admin_id`, `email`, `password` (bcrypt hash) |
| `articles` | `id`, `title`, `source`, `date`, `description`, `link` |
| `upcoming_events` | `id`, `title`, `subtitle` (the date), `url` (ticket link), `flyer_url` |
| `past_events` | `id`, `flyer`, `title`, `subtitle` (the date), `description`, `place` |
| `artists` | `id`, `name`, `contact` |
| `past_events_artists` | `past_event_id`, `artist_id`. Links events to artists; rows are deleted when either side is deleted |
| `members` | `id`, `first_name`, `last_name`, `role`, `photo`, `description`, `fun_fact`, `type` |
| `refresh_tokens` | `id`, `admin_user_id`, `token` (unique), `expires_at`, `created_at` |
| `reset_tokens` | `admin_user_id`, `token` (primary key), `expires_at` |

Some columns have old names (`subtitle` holds a date, `url` holds a ticket link). The repositories rename them with SQL aliases, so the API returns tidier names like `date`, `ticketLink` and `flyerUrl`.

> **Back up the production database.** The previous database was lost when an old AWS account was closed. Turn on backups for the Postgres service in Railway, or schedule `pg_dump` exports.

---

## Deployment (Railway)

Production runs on Railway in the project **`nextworld-website-backend`**, environment **`production`**:

| Railway service | What it is |
|---|---|
| `nextworldwebsite` | This Express app, built from the GitHub repo `eltonSalanic/nextworldwebsite` |
| `Postgres` | The managed PostgreSQL database (with a volume for its data) |

### How deploys happen

- **Every push to `main` deploys automatically.** Railway pulls the repo, builds from the **Root Directory `/backend`** with Railpack (it detects Node and runs `npm install`), and starts the app with `npm start`.
- **Railway sets `PORT`**, and `server.js` listens on it.
- **You can watch progress** in the service's **Deployments** tab. A deploy is done when it shows **SUCCESS / Active**.
- **Optional:** to skip redeploys for frontend-only commits, set **Settings → Build → Watch Paths** to `/backend/**`.

### Service settings

| Setting | Value |
|---|---|
| Source | GitHub `eltonSalanic/nextworldwebsite`, branch `main` |
| Root Directory | `/backend` |
| Start command | `npm start` (the default) |
| Custom domain | `api.nxtworld.co`, via a CNAME record at Porkbun pointing to the target Railway gives you (currently `ltjmid6r.up.railway.app`) |

### Variables

Set these in the `nextworldwebsite` service's **Variables** tab. The database values reference the `Postgres` service, so they update automatically and connect over Railway's private network:

```
NODE_ENV=production
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_NAME=${{Postgres.PGDATABASE}}
ALLOWED_ORIGINS=https://www.nxtworld.co,https://nxtworld.co
FRONTEND_PASSWORD_RESET_URL=www.nxtworld.co/admin/reset-password
JWT_SECRET=...
ACCESS_EXPIRY_MINUTES=15
REFRESH_EXPIRY_DAYS=7
SALT_ROUNDS=10
FROM_EMAIL=...
EMAIL_PASS=...
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY=...
AWS_SECRET_ACCESS_KEY=...
AWS_IMAGE_BUCKET=nxtworld
```

- **Don't set `PORT`**, because Railway provides it.
- **Saving variables triggers a redeploy.**
- **If you rename the Postgres service,** update the `${{Postgres.…}}` references to match.

### Setting up a new database

A new Railway Postgres database starts empty. Create the tables once by pasting [`database.sql`](database.sql) into the Postgres service's **Data** tab. Then [add an admin user](#adding-admin-users).

### Useful CLI commands

Install the CLI with `brew install railway`, then run `railway login`, and `railway link` from `backend/`. When `railway link` asks you to select a service, choose **`nextworldwebsite`**.

```bash
railway status                               # linked project/service and whether it's online
railway logs --service nextworldwebsite      # runtime logs
railway ssh --service nextworldwebsite       # shell inside the running container
```

---

## Adding admin users

There's no sign-up page. You create admins with [`scripts/createAdmin.js`](scripts/createAdmin.js), which:
- asks for the password twice, without showing it as you type,
- hashes it with bcrypt using `SALT_ROUNDS`,
- inserts the row into `admin_users`.

It refuses duplicate emails, mismatched passwords, and passwords shorter than 8 characters.

Login compares emails **exactly** as typed, so create the admin with the exact email you'll log in with.

### In production (recommended: inside Railway)

The production database is only reachable on Railway's private network, so run the script **inside the deployed backend container** with `railway ssh`. The container already has all the `DB_*` variables.

1. **One-time setup:** create an SSH key and register it with Railway.
   ```bash
   ssh-keygen -t ed25519 -C "you@example.com"      # accept the default location
   railway ssh keys add --key ~/.ssh/id_ed25519.pub --name "my-laptop"
   ```
2. **Connect and create the admin:**
   ```bash
   cd backend
   railway ssh --service nextworldwebsite
   # now inside the container:
   npm run create-admin -- newadmin@example.com
   exit
   ```
3. **Log in** at https://www.nxtworld.co/admin/login.

**If you can't use SSH:** create the hash on your own machine, then insert the row from the Postgres service's **Data** tab in Railway:
```bash
node -e "import('bcrypt').then(b=>b.default.hash(process.argv[1],12).then(console.log))" 'ThePassword'
```
```sql
INSERT INTO admin_users (email, password) VALUES ('newadmin@example.com', '$2b$12$...');
```
This leaves the password in your shell history, so clear it afterwards.

**If the Postgres service has public networking turned on,** you can also run the script from your own machine with its public URL:
```bash
DATABASE_URL="<DATABASE_PUBLIC_URL from the Postgres service>" npm run create-admin -- newadmin@example.com
```

### Locally

```bash
npm run create-admin -- you@example.com   # uses the DB_* values in .env
```

### Removing an admin or changing a password

- **To remove an admin or change an email,** edit or delete the row in `admin_users` using the Postgres **Data** tab.
- **To change a password,** use **Forgot password** on the login page, which needs `FROM_EMAIL` and `EMAIL_PASS` set.

---

## Troubleshooting

| What you see | Likely cause |
|---|---|
| `500 "An unexpected error occured"` on every request from the site | The site's origin isn't in `ALLOWED_ORIGINS`. It has to match exactly (`https://`, `www`, no trailing slash) |
| `500 "Could not retrieve …"` | A database query failed. The real reason is in `railway logs`, under `cause`. Common ones: the tables haven't been created (`relation "…" does not exist`), or the `DB_*` variables are wrong |
| Admin login works, but you're logged out after refreshing the page | The refresh cookie isn't being sent. Check that the frontend and API are on the same site (`*.nxtworld.co`) and that `NODE_ENV=production` |
| No password-reset email arrives | `EMAIL_PASS` has to be a Gmail App Password. Also check `FROM_EMAIL`, and look in `railway logs` |
| Image upload fails with a 403 from S3 | The upload's `Content-Type` has to match the `contentType` the URL was signed for. Also check the AWS keys, and the bucket's CORS settings allow `PUT` from the site |
| `railway ssh` says "No SSH keys found" | Create a key and register it with Railway, as in [step 1 above](#in-production-recommended-inside-railway) |
