# Supabase Authentication Fix Guide for Next.js 15

## Problem Summary
You're experiencing issues with Supabase authentication where:
1. Existing accounts can't log in
2. New accounts get "Email link is invalid or has expired" error
3. Users appear in Supabase backend but can't authenticate

## Solution Steps

### 1. Update Supabase Email Templates

Go to your Supabase Dashboard → Authentication → Email Templates and update:

#### Confirm signup template:
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a></p>
```

#### Magic Link template:
```html
<h2>Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink">Log In</a></p>
```

#### Reset Password template:
```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password">Reset Password</a></p>
```

### 2. Configure Supabase URL Settings

In Supabase Dashboard → Authentication → URL Configuration:

#### Site URL:
- Set to `http://localhost:3000` for development
- Or your production URL for production

#### Redirect URLs (add all of these):
```
http://localhost:3000/**
http://localhost:3001/**
http://localhost:3002/**
https://your-production-domain.com/**
https://*.vercel.app/**
```

### 3. Update Environment Variables

Ensure your `.env.local` file has:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Debug Tools

Use these debug pages to troubleshoot:

1. **Check Auth Status**: Go to `/auth/debug`
   - Shows current user status
   - Shows session status
   - Shows auth cookies
   - Shows environment configuration

2. **Test Server Login**: Go to `/auth/test-login`
   - Uses server actions instead of client-side auth
   - Helps isolate client-side issues

### 5. Common Issues and Solutions

#### Issue: "Email link is invalid or has expired"
**Causes:**
- Email template not updated
- Redirect URLs not configured
- Token expired (links expire after 1 hour by default)

**Solution:**
1. Update email templates as shown above
2. Add redirect URLs to Supabase dashboard
3. Request a new confirmation email

#### Issue: "Invalid login credentials"
**Causes:**
- Wrong password
- Account not confirmed
- Email doesn't exist

**Solution:**
1. Use "Forgot Password" to reset
2. Check if email is confirmed in Supabase dashboard
3. Verify email exists in Auth → Users

#### Issue: Users can't stay logged in
**Causes:**
- Middleware not refreshing sessions
- Cookie issues

**Solution:**
- Ensure middleware is properly configured
- Check browser cookies are enabled

### 6. Testing Authentication Flow

1. **Sign Up Test:**
   - Go to `/auth/sign-up`
   - Enter email and password
   - Check email for confirmation link
   - Click link - should redirect to `/companies`

2. **Login Test:**
   - Go to `/auth/login`
   - Enter credentials
   - Should redirect to `/companies`

3. **Password Reset Test:**
   - Go to `/auth/forgot-password`
   - Enter email
   - Check email for reset link
   - Click link - should go to password update page

### 7. Debug Checklist

- [ ] Environment variables are set correctly
- [ ] Email templates updated in Supabase
- [ ] Redirect URLs configured in Supabase
- [ ] Site URL matches your development/production URL
- [ ] Middleware is running (check browser network tab)
- [ ] Cookies are enabled in browser
- [ ] No ad blockers interfering with auth
- [ ] User email is confirmed (check in Supabase dashboard)

### 8. Manual User Confirmation (If Needed)

If a user's email isn't confirmed:
1. Go to Supabase Dashboard → Authentication → Users
2. Find the user
3. Click on the user to view details
4. If email_confirmed_at is null, manually confirm by updating the user

### 9. If Issues Persist

1. Check Supabase logs: Dashboard → Logs → Auth
2. Check browser console for errors
3. Verify email service is working in Supabase
4. Try incognito/private browsing mode
5. Clear browser cookies and try again
6. Check `/auth/debug` page for current auth status

## Code Changes Applied

1. **Updated `/app/auth/confirm/route.ts`**:
   - Better error handling
   - Proper redirect with NextResponse
   - Handle Supabase error parameters

2. **Updated `/components/sign-up-form.tsx`**:
   - Changed emailRedirectTo to `/auth/confirm`

3. **Updated `/app/auth/error/page.tsx`**:
   - Better error messages
   - Handle specific error types
   - User-friendly error display

4. **Updated `/components/login-form.tsx`**:
   - Added detailed error handling
   - Added session verification
   - Using window.location.href for hard navigation
   - Better error messages in Spanish

5. **Added `/app/auth/test-login/page.tsx`**:
   - Server-side login test page
   - Helps isolate client-side issues

6. **Added `/app/auth/debug/page.tsx`**:
   - Shows current auth status
   - Shows cookies and environment
   - Helpful for debugging

## Next Steps

1. Update your Supabase email templates
2. Configure redirect URLs in Supabase
3. Go to `/auth/debug` to check current status
4. Try `/auth/test-login` if regular login fails
5. Monitor Supabase logs for any issues 