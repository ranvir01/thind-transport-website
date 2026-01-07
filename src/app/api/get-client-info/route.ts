import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get IP address from headers
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0] || realIp || 'Unknown'
    
    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    
    return NextResponse.json({
      ipAddress: ip,
      userAgent,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error getting client info:', error)
    return NextResponse.json(
      { error: 'Failed to get client info' },
      { status: 500 }
    )
  }
}

