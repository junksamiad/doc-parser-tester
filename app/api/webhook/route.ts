import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for the latest webhook payload
let latestPayload: {
  timestamp: string;
  headers: Record<string, string>;
  body: unknown;
  method: string;
  url: string;
} | null = null;

export async function POST(request: NextRequest) {
  try {
    // Get all headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Get the body
    const contentType = request.headers.get('content-type') || '';
    let body: unknown;

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const formObj: Record<string, unknown> = {};
      formData.forEach((value, key) => {
        formObj[key] = value;
      });
      body = formObj;
    } else {
      body = await request.text();
    }

    // Store the payload
    latestPayload = {
      timestamp: new Date().toISOString(),
      headers,
      body,
      method: request.method,
      url: request.url,
    };

    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      timestamp: latestPayload.timestamp,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process webhook',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    payload: latestPayload,
  });
}

// Support all HTTP methods
export async function PUT(request: NextRequest) {
  return POST(request);
}

export async function PATCH(request: NextRequest) {
  return POST(request);
}

export async function DELETE() {
  // Clear the stored webhook payload
  latestPayload = null;
  return NextResponse.json({
    success: true,
    message: 'Webhook data cleared',
  });
}
