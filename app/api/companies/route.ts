// app/api/companies/route.ts
// GET  → list companies for a module
// POST → create a new company (react-select Creatable)

import { NextRequest, NextResponse } from 'next/server';
import { getCompanies, createCompany } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const module = request.nextUrl.searchParams.get('module') || 'pc';
    const companies = await getCompanies(module);
    return NextResponse.json({ companies });
  } catch (err) {
    console.error('[API] GET /api/companies error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, module = 'pc', created_by } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 },
      );
    }

    const company = await createCompany(name.trim(), module, created_by);
    return NextResponse.json({ company }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/companies error:', err);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 },
    );
  }
}
