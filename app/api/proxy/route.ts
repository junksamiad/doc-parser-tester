import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the request body and content type
    const contentType = request.headers.get('content-type') || '';

    // Parse the target URL from query params or use default
    const targetUrl = request.nextUrl.searchParams.get('url') ||
      'https://document-parser.easyrecruit.ai/api/v1/passport';

    // Get API key from headers
    const apiKey = request.headers.get('x-api-key');

    // Prepare headers for the target API
    const headers: HeadersInit = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    let body: FormData | string;

    // Handle different content types
    if (contentType.includes('multipart/form-data')) {
      // For multipart, forward the FormData as-is
      const formData = await request.formData();
      body = formData;
    } else if (contentType.includes('application/json')) {
      // For JSON, forward as-is
      headers['Content-Type'] = 'application/json';
      body = await request.text();
    } else {
      // Default to text
      body = await request.text();
    }

    // Make the request to the actual API
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body
    });

    // Get the response data
    const data = await response.json();

    // Return the response with proper CORS headers
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      }
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Proxy request failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}