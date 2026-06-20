# PERX

PERX is a benefits marketplace for Albanian teams. Employers fund employee perks, employees choose benefits from local providers, and providers manage offers, redemptions, and performance from one app.

The app is built with TanStack Start, React, Vite, Supabase, Tailwind CSS, Radix UI, and lucide-react.

## Features

- Public landing page with sign in, sign up, and demo account entry points.
- Role-based dashboards for employees, employers, and providers.
- Employee marketplace, saved offers, cart, requests, redemptions, and quests.
- Employer tools for company policy, funding, analytics, and quest management.
- Provider tools for offers, co-provider sharing, AI-assisted insights, and redemption handling.
- Supabase authentication, database migrations, RPCs, and server-side routes.
- AI chat and insights endpoints when `LOVABLE_API_KEY` is configured.

## Tech Stack

- React 19
- TanStack Start and TanStack Router
- Vite
- TypeScript
- Supabase
- Tailwind CSS
- Radix UI
- Recharts
- Leaflet

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run linting:

```bash
npm run lint
```

## Environment Variables

Create a local `.env` file with the variables needed by the client and server:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

LOVABLE_API_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` should only be used on the server. Do not expose it in client-side code.

## Supabase

Database migrations live in `supabase/migrations`. The app expects Supabase auth, tables, policies, and RPCs created by those migrations.

Important Supabase areas:

- `src/integrations/supabase/client.ts` creates the browser and SSR-safe Supabase client.
- `src/integrations/supabase/client.server.ts` creates the server/admin client.
- `src/integrations/supabase/auth-middleware.ts` attaches authenticated Supabase access to server functions.
- `supabase/config.toml` contains the local Supabase project config.

## Project Structure

```text
src/
  components/      Shared UI and product components
  hooks/           React hooks
  integrations/    Supabase integration code
  lib/             App utilities, roles, billing, AI, and server functions
  routes/          TanStack routes and API routes
  styles.css       Global styles
supabase/
  migrations/      Database migrations
```

## Deployment

This is a TanStack Start app with server output and API routes. A full production deployment needs a host that can run the server build, such as Vercel, Netlify, Cloudflare, or another Node/server-capable platform.

Use this build command:

```bash
npm run build
```

Then configure the same environment variables from the Environment Variables section in the hosting provider.

## GitHub Pages

GitHub Pages is static hosting. It can publish HTML, CSS, and JavaScript, but it does not run this app's server routes or server functions. If you deploy only the static client files to GitHub Pages, features that depend on `/api/*`, server functions, SSR behavior, or server-only Supabase logic may not work.

For the full PERX app, connect the GitHub repository to a server-capable host instead of relying on GitHub Pages alone.

## Scripts

```bash
npm run dev        # Start local development
npm run build      # Build production client and server bundles
npm run build:dev  # Build in development mode
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run format     # Format files with Prettier
```

## Notes

This repository is connected to Lovable. Avoid force pushes, rebases, amends, or squashing commits that have already been pushed, because rewriting published history can break Lovable project history.
