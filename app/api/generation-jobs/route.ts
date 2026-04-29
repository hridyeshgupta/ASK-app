// app/api/generation-jobs/route.ts
// GET  → list generation jobs for a company
// POST → create a new generation job
// PATCH → update generation job status/progress/output

import { NextRequest, NextResponse } from 'next/server';
import {
  getGenerationJobs,
  createGenerationJob,
  createRaGenerationJob,
  updateGenerationJob,
  getGenerationJobByBackendId,
} from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get('company_id');
    const backendJobId = request.nextUrl.searchParams.get('backend_job_id');
    const module = request.nextUrl.searchParams.get('module') || 'pc';

    // Lookup by backend job ID (for mapping polling results)
    if (backendJobId) {
      const job = await getGenerationJobByBackendId(backendJobId, module);
      return NextResponse.json({ job });
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id or backend_job_id is required' },
        { status: 400 },
      );
    }

    const jobs = await getGenerationJobs(companyId, module);
    return NextResponse.json({ jobs });
  } catch (err) {
    console.error('[API] GET /api/generation-jobs error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch generation jobs' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id, section_name, subsidiary_name, backend_job_id, created_by, module = 'pc' } = body;

    if (!company_id || !backend_job_id) {
      return NextResponse.json(
        { error: 'company_id and backend_job_id are required' },
        { status: 400 },
      );
    }

    let job;
    if (module === 'ra') {
      job = await createRaGenerationJob(company_id, backend_job_id, created_by);
    } else {
      if (!section_name) {
        return NextResponse.json(
          { error: 'section_name is required for PC module' },
          { status: 400 },
        );
      }
      job = await createGenerationJob(
        company_id,
        section_name,
        subsidiary_name || null,
        backend_job_id,
        created_by,
      );
    }

    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/generation-jobs error:', err);
    return NextResponse.json(
      { error: 'Failed to create generation job' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { job_id, status, progress, output_url, error_message, module = 'pc' } = body;

    if (!job_id) {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 },
      );
    }

    const job = await updateGenerationJob(job_id, { status, progress, output_url, error_message }, module);
    return NextResponse.json({ job });
  } catch (err) {
    console.error('[API] PATCH /api/generation-jobs error:', err);
    return NextResponse.json(
      { error: 'Failed to update generation job' },
      { status: 500 },
    );
  }
}
