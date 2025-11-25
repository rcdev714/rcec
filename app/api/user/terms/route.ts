import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPostgrestError } from '@/lib/type-guards'
import { CURRENT_TERMS_VERSION } from '@/lib/terms'

const unauthorizedResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return unauthorizedResponse
    }

    const { data, error } = await supabase
      .from('user_terms_acceptances')
      .select('id, terms_version, accepted_at')
      .eq('user_id', user.id)
      .eq('terms_version', CURRENT_TERMS_VERSION)
      .maybeSingle()

    if (error) {
      console.error('Error fetching terms acceptance:', error)
      return NextResponse.json(
        { error: 'Failed to fetch acceptance status' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        accepted: Boolean(data),
        acceptance: data ?? null,
        currentVersion: CURRENT_TERMS_VERSION,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error in GET /api/user/terms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return unauthorizedResponse
    }

    const body = await safeParseJson<{ termsVersion?: string }>(request)
    const versionFromClient = body?.termsVersion

    if (versionFromClient && versionFromClient !== CURRENT_TERMS_VERSION) {
      return NextResponse.json(
        { error: 'La versión enviada no coincide con la versión vigente.' },
        { status: 400 }
      )
    }

    const { data: existingAcceptance, error: existingError } = await supabase
      .from('user_terms_acceptances')
      .select('id, terms_version, accepted_at')
      .eq('user_id', user.id)
      .eq('terms_version', CURRENT_TERMS_VERSION)
      .maybeSingle()

    if (existingError) {
      console.error('Error checking existing acceptance:', existingError)
      return NextResponse.json({ error: 'No se pudo validar tu aceptación.' }, { status: 500 })
    }

    if (existingAcceptance) {
      return NextResponse.json(
        {
          accepted: true,
          acceptance: existingAcceptance,
          currentVersion: CURRENT_TERMS_VERSION,
        },
        { status: 200 }
      )
    }

    const acceptedFromIp = extractClientIp(request)
    const acceptedUserAgent = request.headers.get('user-agent') ?? null

    const { data, error } = await supabase
      .from('user_terms_acceptances')
      .insert({
        user_id: user.id,
        terms_version: CURRENT_TERMS_VERSION,
        accepted_from_ip: acceptedFromIp,
        accepted_user_agent: acceptedUserAgent,
      })
      .select('id, terms_version, accepted_at')
      .single()

    if (error) {
      console.error('Error inserting terms acceptance:', error)
      const message = isPostgrestError(error)
        ? error.message
        : 'No se pudo registrar tu aceptación.'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json(
      {
        accepted: true,
        acceptance: data,
        currentVersion: CURRENT_TERMS_VERSION,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/user/terms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function extractClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',').map((value) => value.trim()).find(Boolean)
    if (firstIp) {
      return firstIp
    }
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  return null
}

async function safeParseJson<T>(request: Request): Promise<T | null> {
  try {
    const text = await request.text()
    if (!text) {
      return null
    }
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

