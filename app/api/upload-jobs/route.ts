// app/api/upload-jobs/route.ts
// GET  → list upload jobs for a company
// POST → create a new upload job record
// PATCH → update upload job status/progress

import { NextRequest, NextResponse } from 'next/server';
import { getUploadJobs, getLatestUploadJob, createUploadJob, updateUploadJob } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get('company_id');
    const latest = request.nextUrl.searchParams.get('latest');
    const module = request.nextUrl.searchParams.get('module') || 'pc';

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 },
      );
    }

    if (latest === 'true') {
      const job = await getLatestUploadJob(companyId, module);
      return NextResponse.json({ job });
    }

    const jobs = await getUploadJobs(companyId, module);
    return NextResponse.json({ jobs });
  } catch (err) {
    console.error('[API] GET /api/upload-jobs error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch upload jobs' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id, file_names, file_categories, uploaded_by, module = 'pc' } = body;

    if (!company_id) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 },
      );
    }

    const job = await createUploadJob(
      company_id,
      file_names || [],
      file_categories || {},
      uploaded_by,
      module,
    );
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/upload-jobs error:', err);
    return NextResponse.json(
      { error: 'Failed to create upload job' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { job_id, status, progress, error_message, gcs_paths, module = 'pc' } = body;

    if (!job_id) {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 },
      );
    }

    const job = await updateUploadJob(job_id, { status, progress, error_message, gcs_paths }, module);
    return NextResponse.json({ job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API] PATCH /api/upload-jobs error:', message, err);
    return NextResponse.json(
      { error: `Failed to update upload job: ${message}` },
      { status: 500 },
    );
  }
}
