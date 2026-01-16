// Supabase Edge Function: Image Proxy for CORS bypass
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // GET 요청: URL 파라미터에서 이미지 URL 가져오기
    const url = new URL(req.url)
    let imageUrl = url.searchParams.get('url')

    // POST 요청: body에서 URL 가져오기
    if (!imageUrl && req.method === 'POST') {
      const body = await req.json()
      imageUrl = body.url
    }

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing url parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Dropbox URL인지 확인 (보안)
    const allowedDomains = [
      'dl.dropboxusercontent.com',
      'www.dropbox.com',
      'dropbox.com'
    ]

    const imageUrlObj = new URL(imageUrl)
    if (!allowedDomains.some(domain => imageUrlObj.hostname.includes(domain))) {
      return new Response(
        JSON.stringify({ error: 'Only Dropbox URLs are allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 이미지 fetch
    const response = await fetch(imageUrl)

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch image: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Content-Type 확인
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream'

    // 이미지 데이터를 그대로 반환
    const imageData = await response.arrayBuffer()

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 24시간 캐시
      }
    })

  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
