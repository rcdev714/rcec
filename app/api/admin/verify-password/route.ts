import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_PASSWORD = 'arcane';
const COOKIE_NAME = 'admin_password_verified';
const COOKIE_MAX_AGE = 60 * 60; // 1 hour in seconds

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { verified: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password === ADMIN_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.set(COOKIE_NAME, 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json(
      { verified: false, error: 'Invalid password' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json(
      { verified: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

