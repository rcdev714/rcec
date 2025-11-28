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

## Troubleshooting

-   **"Cookies outside request scope"**: This is fixed by our recent changes to `contact-tools.ts` and `nodes.ts` which detect the background environment and use the Service Role client.
-   **Missing Environment Variables**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in **BOTH** Netlify and Trigger.dev dashboards.

