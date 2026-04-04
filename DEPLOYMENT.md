# Deployment Instructions (Vercel)

This project is a **Vite + React** SPA. Vercel detects the stack and runs `npm run build`; static output is served from the `dist` folder.

## Prerequisites

- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account (sign in with GitHub)
- [Supabase](https://supabase.com) project with URL + **anon (public)** API key
- [Groq](https://console.groq.com) API key (or another OpenAI-compatible endpoint you configure)

> **Security:** All `VITE_*` variables are embedded in the browser bundle. Anyone can see them in DevTools. For production, consider moving AI calls behind your own server or Vercel Serverless Functions.

---

## 1. Push the code to GitHub

1. Create a new repository on GitHub (empty, no README required if you already have files locally).
2. In your project folder, if Git is not initialized yet:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. Add the remote and push (replace `YOUR_USER` and `YOUR_REPO`):

   ```bash
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

4. **Never commit `.env`** — it is listed in `.gitignore`. Use `.env.example` as a template only.

---

## 2. Connect GitHub to Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. **Import** your GitHub repository (install the Vercel GitHub app if prompted).
3. Vercel should detect **Vite**:
   - **Framework Preset:** Vite  
   - **Build Command:** `npm run build` (default)  
   - **Output Directory:** `dist` (default)
4. Click **Deploy** once environment variables are set (next section), or deploy and add variables then **Redeploy**.

---

## 3. Environment variables (Vercel Dashboard)

In the Vercel project: **Settings → Environment Variables**.

Add the following for **Production** (and **Preview** if you want preview deployments to work):

| Name | Required | Description |
|------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL, e.g. `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | **Public anon** JWT (`eyJ…`), not `sb_secret_…` |
| `VITE_AI_API_KEY` | Yes* | Groq (or compatible) API key. Same role as `VITE_GROQ_API_KEY`. |
| `VITE_GROQ_API_KEY` | No* | Alternative name; the app uses `VITE_GROQ_API_KEY` **or** `VITE_AI_API_KEY` |

\* At least one of `VITE_GROQ_API_KEY` or `VITE_AI_API_KEY` must be set for analysis/translation features.

Optional overrides:

| Name | Default |
|------|---------|
| `VITE_AI_BASE_URL` | `https://api.groq.com/openai/v1` |
| `VITE_AI_MODEL` | `llama-3.3-70b-versatile` |

After changing variables, trigger a new deployment: **Deployments → … → Redeploy** (or push a commit).

---

## 4. SPA routing

`vercel.json` rewrites unknown paths to `/index.html` so client-side routes (if you add them later) keep working. Static files under `dist` (e.g. `/assets/*`, favicon) are still served normally.

---

## 5. Verify the live app

- Open the production URL from Vercel.
- You should see the login screen if Supabase is configured correctly.
- Run a test analysis only after the AI key is set and redeployed.

---

## Local development

Copy `.env.example` to `.env`, fill in values, then:

```bash
npm install
npm run dev
```

---

## Troubleshooting

- **Blank / config error screen:** Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; save `.env` as UTF-8 **without BOM** locally; on Vercel, re-check for typos and extra spaces.
- **“Forbidden use of secret API key”:** You used a **secret** Supabase key in the browser — use the **anon public** key only.
- **AI errors:** Confirm `VITE_GROQ_API_KEY` or `VITE_AI_API_KEY` is set and redeployed; check Groq quota and model name.
