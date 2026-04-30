// app/api/proxy/[...path]/route.ts
// Catch-all proxy for PPT Agent backend requests.
// Routes: /api/proxy/upload, /api/proxy/generate, /api/proxy/status/:id, etc.
// Eliminates CORS by making server-to-server calls.

import { NextRequest, NextResponse } from 'next/server';

const PC_API_BASE = process.env.NEXT_PUBLIC_PC_API_URL || '';

function getBackendUrl(path: string): string {
  return `${PC_API_BASE}/${path}`;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!PC_API_BASE) return errorResponse('Backend API URL not configured', 503);

  const { path } = await params;
  const backendPath = path.join('/');
  let url = getBackendUrl(backendPath);

  // Forward query parameters from the incoming request (e.g., ?query=...&company=...)
  const searchParams = request.nextUrl.searchParams.toString();
  if (searchParams) {
    url += `?${searchParams}`;
  }

  try {
    const response = await fetch(url);

    // Check content-type to decide how to proxy the response.
    // Binary responses (e.g. PPTX downloads) must be streamed through as-is;
    // only JSON responses should be parsed and re-serialised.
    const respContentType = response.headers.get('content-type') || '';
    if (respContentType.includes('application/json')) {
      const data = await response.json().catch(() => ({ error: response.statusText }));
      return NextResponse.json(data, { status: response.status });
    }

    // Non-JSON (binary files like .pptx) — stream through with original headers
    const blob = await response.blob();
    return new NextResponse(blob, {
      status: response.status,
      headers: {
        'Content-Type': respContentType,
        'Content-Disposition': response.headers.get('content-disposition') || '',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Proxy GET] /${backendPath} error:`, msg);
    return errorResponse(`Proxy failed: ${msg}`, 502);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!PC_API_BASE) return errorResponse('Backend API URL not configured', 503);

  const { path } = await params;
  const backendPath = path.join('/');
  const url = getBackendUrl(backendPath);

  try {
    const contentType = request.headers.get('content-type') || '';

    let body: FormData | string;
    let headers: Record<string, string> | undefined;

    if (contentType.includes('multipart/form-data')) {
      // Forward FormData as-is (for /upload)
      body = await request.formData();
    } else if (contentType.includes('application/json')) {
      body = await request.text();
      headers = { 'Content-Type': 'application/json' };
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      body = await request.formData();
    } else {
      body = await request.formData();
    }

    const response = await fetch(url, {
      method: 'POST',
      body,
      headers,
    });

    // Handle binary downloads (e.g., PPTX files)
    const respContentType = response.headers.get('content-type') || '';
    if (respContentType.includes('application/json')) {
      const data = await response.json().catch(() => ({ error: response.statusText }));
      return NextResponse.json(data, { status: response.status });
    }

    // For non-JSON responses (binary files), stream through
    const blob = await response.blob();
    return new NextResponse(blob, {
      status: response.status,
      headers: {
        'Content-Type': respContentType,
        'Content-Disposition': response.headers.get('content-disposition') || '',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Proxy POST] /${backendPath} error:`, msg);
    return errorResponse(`Proxy failed: ${msg}`, 502);
  }
}
