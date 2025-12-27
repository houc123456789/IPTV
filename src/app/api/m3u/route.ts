import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'Missing URL' },
        { status: 400 }
      );
    }

    console.log('Fetching M3U URL:', url.replace(/password=[^&]+/, 'password=***'));

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    const content = await response.text();
    return NextResponse.json({ content });
  } catch (error) {
    console.error('M3U proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy error' },
      { status: 500 }
    );
  }
}
