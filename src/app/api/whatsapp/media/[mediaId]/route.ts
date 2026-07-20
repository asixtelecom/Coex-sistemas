import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMediaUrl, downloadMedia } from '@/lib/whatsapp/meta-api'
import { decrypt } from '@/lib/whatsapp/encryption'
import fs from 'fs'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Server-side in-memory cache: mediaId -> { buffer, contentType, ts }
const mediaCache = new Map<string, { buffer: ArrayBuffer; contentType: string; ts: number }>()
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }

    // Check server-side cache first
    const cached = mediaCache.get(mediaId)
    if (cached && Date.now() - cached.ts < CACHE_MAX_AGE_MS) {
      return new Response(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          'Content-Type': cached.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache': 'MEM-HIT',
        },
      })
    }

    // Check disk cache next (before auth check for maximum fluid loading)
    const cacheDir = path.join(process.cwd(), 'storage', 'whatsapp-media')
    const filePath = path.join(cacheDir, mediaId)
    const metaPath = path.join(cacheDir, `${mediaId}.meta`)

    try {
      if (fs.existsSync(filePath) && fs.existsSync(metaPath)) {
        const [fileBuffer, metaStr] = await Promise.all([
          readFile(filePath),
          readFile(metaPath, 'utf8')
        ])
        const meta = JSON.parse(metaStr)
        const contentType = meta.contentType || 'application/octet-stream'

        // Convert Buffer to ArrayBuffer
        const arrayBuffer = fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength
        ) as ArrayBuffer

        // Populate in-memory cache
        mediaCache.set(mediaId, {
          buffer: arrayBuffer,
          contentType,
          ts: Date.now()
        })

        return new Response(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Cache': 'DISK-HIT',
          },
        })
      }
    } catch (e) {
      console.warn('[media-cache] Error reading disk cache:', e)
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle()
    const accountId = profile?.account_id as string | undefined
    if (!accountId) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 },
      )
    }

    const { data: configs, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('account_id', accountId)
      .limit(1)

    const config = configs?.[0]
    if (configError || !config) {
      return NextResponse.json(
        { error: 'WhatsApp not configured' },
        { status: 400 }
      )
    }

    const accessToken = decrypt(config.access_token)
    const mediaInfo = await getMediaUrl({ mediaId, accessToken })
    const { buffer, contentType } = await downloadMedia({
      downloadUrl: mediaInfo.url,
      accessToken,
    })

    const finalContentType = contentType || mediaInfo.mimeType || 'application/octet-stream'

    // Convert Buffer to ArrayBuffer
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer

    // Store in disk cache
    try {
      await mkdir(cacheDir, { recursive: true })
      await Promise.all([
        writeFile(filePath, new Uint8Array(arrayBuffer)),
        writeFile(metaPath, JSON.stringify({ contentType: finalContentType }))
      ])
    } catch (e) {
      console.error('[media-cache] Error writing disk cache:', e)
    }

    // Store in server cache
    mediaCache.set(mediaId, {
      buffer: arrayBuffer,
      contentType: finalContentType,
      ts: Date.now(),
    })

    // Evict old entries if cache grows too large
    if (mediaCache.size > 500) {
      const now = Date.now()
      for (const [key, val] of mediaCache) {
        if (now - val.ts > CACHE_MAX_AGE_MS) mediaCache.delete(key)
      }
    }

    return new Response(new Uint8Array(arrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': finalContentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'MISS',
      },
    })
  } catch (error) {
    console.error('Error in WhatsApp media GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    )
  }
}
