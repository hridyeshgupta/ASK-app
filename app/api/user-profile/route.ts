// app/api/user-profile/route.ts
// GET  → fetch user profile by Firebase UID
// POST → create/update user profile (upsert on first login)

import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, upsertUserProfile } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const uid = request.nextUrl.searchParams.get('uid');

    if (!uid) {
      return NextResponse.json(
        { error: 'uid is required' },
        { status: 400 },
      );
    }

    const profile = await getUserProfile(uid);

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[API] GET /api/user-profile error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebase_uid, display_name, email, role, modules } = body;

    if (!firebase_uid) {
      return NextResponse.json(
        { error: 'firebase_uid is required' },
        { status: 400 },
      );
    }

    const profile = await upsertUserProfile(
      firebase_uid,
      display_name || null,
      email || null,
      role || 'member',
      modules || ['pc'],
    );

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[API] POST /api/user-profile error:', err);
    return NextResponse.json(
      { error: 'Failed to save user profile' },
      { status: 500 },
    );
  }
}
