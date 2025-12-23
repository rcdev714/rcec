# Deployment Guide: Netlify + Trigger.dev

This guide details how to deploy the RCEC application with the Sales Agent integration to production.

## Prerequisites

1.  **Netlify Account**: For hosting the Next.js application.
2.  **Trigger.dev Account**: For hosting the background agent tasks.
3.  **Supabase Project**: For the database.
4.  **Google AI Studio API Key**: For Gemini models.

## Part 1: Trigger.dev Deployment

Trigger.dev tasks run on their cloud infrastructure, separate from your Next.js app.

1.  **Login to Trigger.dev CLI**:
    ```bash
    npx trigger.dev@latest login
    ```

2.  **Select/Create Project**:
    Ensure your `trigger.config.ts` has the correct `project` ID. If not, update it to match your production project in the Trigger.dev dashboard.

3.  **Deploy Tasks**:
    Run the deployment script we added to `package.json`:
    ```bash
    npm run trigger:deploy
    ```
    This pushes your `src/trigger` code to Trigger.dev.

4.  **Configure Environment Variables (Trigger.dev)**:
    In the Trigger.dev Dashboard, go to **Settings > Environment Variables** and add:
    - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
    - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (Critical for background tasks)
    - `GOOGLE_API_KEY`: Your Gemini API Key
    - `OPENAI_API_KEY`: (If used by any sub-tools)
    - `TAVILY_API_KEY`: (If used for web search)

## Part 2: Netlify Deployment

1.  **Push to GitHub/GitLab/Bitbucket**:
    Ensure your latest code is pushed to your repository.

2.  **Create New Site in Netlify**:
    - Import from Git.
    - Select your repository.
    - **Build Command**: `npm run build`
    - **Publish Directory**: `.next`

3.  **Configure Environment Variables (Netlify)**:
    Go to **Site configuration > Environment variables** and add:
    
    *Standard Keys:*
    - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key
    - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key
    - `GOOGLE_API_KEY`: Your Gemini API Key
    
    *Trigger.dev Keys:*
    - `TRIGGER_SECRET_KEY`: From your Trigger.dev Project Settings (API Keys section).
    
    *Application Config:*
    - `NEXT_PUBLIC_APP_URL`: Your production URL (e.g., `https://your-app.netlify.app`)

4.  **Deploy**:
    Trigger a deployment in Netlify.

## Part 3: Verification

1.  Open your deployed Netlify app.
2.  Navigate to the Chat/Agent interface.
3.  Send a message (e.g., "Find companies in Quito").
4.  The app should:
    - Start a run in Trigger.dev (visible in Trigger.dev dashboard).
    - Receive real-time updates via Supabase.
    - Display the final response.

## Part 4: Automating Trigger.dev Deployment (GitHub Actions)

This setup ensures your background tasks are automatically updated whenever you push code, just like Netlify updates your site.

1.  **Get Access Token**:
    - Go to Trigger.dev Dashboard > Profile Picture > Access Tokens.
    - Create a token (e.g. "GitHub Actions").

2.  **Add to GitHub Secrets**:
    - Go to your GitHub Repo > Settings > Secrets and variables > Actions.
    - Add `TRIGGER_ACCESS_TOKEN` with the value from step 1.

3.  **Push the Workflow**:
    - We have created `.github/workflows/deploy-trigger.yml`.
    - Push this file to your repository.

Now, every `git push` to main will:
1.  Trigger Netlify to build/deploy the web app.
2.  Trigger GitHub Actions to deploy the background tasks to Trigger.dev.

## Troubleshooting

-   **"Cookies outside request scope"**: This is fixed by our recent changes to `contact-tools.ts` and `nodes.ts` which detect the background environment and use the Service Role client.
-   **Missing Environment Variables**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in **BOTH** Netlify and Trigger.dev dashboards.

### Fix rápido: 401 `disabled_client` al iniciar sesión con Google (Supabase OAuth)

Este error **no se arregla cambiando claves en Next.js** (en este repo Google login se hace con `supabase.auth.signInWithOAuth({ provider: 'google' })`).
Normalmente significa que el **OAuth Client de Google está deshabilitado** o mal configurado, y Supabase solo te lo “rebota”.

#### 1) Crear un nuevo OAuth Client en Google Cloud

En **Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID**:

- **Application type**: Web application
- **Authorized JavaScript origins** (⚠️ solo ORIGEN, sin path y sin `/` al final):
  - ✅ `http://localhost:3000`
  - ✅ `https://<tu-dominio-prod>`
  - ❌ `http://localhost:3000/auth/callback/`
  - ❌ `https://<tu-dominio-prod>/auth/callback/`
- **Authorized redirect URIs** (CRÍTICO: es el callback de Supabase, no el de Next.js):
  - `https://<tu-supabase-project-ref>.supabase.co/auth/v1/callback`
  - (opcional si usas Supabase local) `http://localhost:54321/auth/v1/callback`

Guarda y copia el **Client ID** y **Client Secret** nuevos.

#### 2) Pegar credenciales nuevas en Supabase

En **Supabase Dashboard → Authentication → Providers → Google**:

- Pega el **Client ID** nuevo
- Pega el **Client Secret** nuevo
- Guarda cambios

> Tip: si recién creaste el client, a veces tarda 1–5 min en “propagar”.

#### 3) Verificar redirects permitidos en Supabase (para este repo)

Este proyecto redirige a:

- `http://localhost:3000/auth/callback` (dev)
- `https://<tu-dominio-prod>/auth/callback` (prod)

Entonces en **Supabase Dashboard → Authentication → URL Configuration** revisa:

- **Site URL**: `https://<tu-dominio-prod>`
- **Additional Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - `https://<tu-dominio-prod>/auth/callback`

#### 4) Probar y limpiar sesión

- Cierra sesión (o borra cookies/localStorage) y reintenta “Continuar con Google”.
- Si vuelve a fallar, revisa el mensaje en `/auth/error` (ahora mostramos el error cuando el proveedor devuelve `error`).

