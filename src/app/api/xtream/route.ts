import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { server, username, password, action, params } = body;

    if (!server || !username || !password) {
      return NextResponse.json(
        { error: 'Missing credentials' },
        { status: 400 }
      );
    }

    // Build the Xtream API URL as a simple string
    const baseUrl = server.replace(/\/$/, '');
    let apiUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

    if (action) {
      apiUrl += `&action=${encodeURIComponent(action)}`;
    }

    // Add additional params
    if (params && typeof params === 'object') {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          apiUrl += `&${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
        }
      }
    }

    console.log('Fetching Xtream URL:', apiUrl.replace(/password=[^&]+/, 'password=***'));

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
        'Cache-Control': 'no-cache',
      },
    });

    // Get the raw response text first
    const responseText = await response.text();

    console.log('Xtream response status:', response.status);
    console.log('Xtream response preview:', responseText.substring(0, 200));

    if (!response.ok) {
      return NextResponse.json(
        { error: `Xtream API error: ${response.status}`, details: responseText.substring(0, 500) },
        { status: response.status }
      );
    }

    // Parse JSON
    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON response from Xtream server', details: responseText.substring(0, 500) },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Xtream proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy error' },
      { status: 500 }
    );
  }
}
