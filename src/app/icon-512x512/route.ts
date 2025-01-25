import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const iconPath = path.join(process.cwd(), 'public', 'icon-512x512.png')
  const iconBuffer = await fs.promises.readFile(iconPath)

  return new NextResponse(iconBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000',
    },
  })
}