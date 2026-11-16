import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { buildZipArchive } from '@/lib/zip';

const PHP_ROOT = path.join(process.cwd(), 'php-package');

async function collectFiles(
  dir: string,
  baseDir: string
): Promise<Array<{ relPath: string; content: Buffer }>> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: Array<{ relPath: string; content: Buffer }> = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await collectFiles(fullPath, baseDir);
      results.push(...sub);
    } else if (entry.isFile()) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const content = await fs.readFile(fullPath);
      results.push({ relPath, content });
    }
  }
  return results;
}

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const files = await collectFiles(PHP_ROOT, PHP_ROOT);
  const mode = req.nextUrl.searchParams.get('mode');

  if (mode === 'manifest') {
    return NextResponse.json({
      files: files.map((f) => ({
        path: `order-calculator/${f.relPath}`,
        size: f.content.length,
        preview: f.content.toString('utf8'),
      })),
    });
  }

  const zipBuffer = buildZipArchive(
    files.map((f) => ({
      name: `order-calculator/${f.relPath}`,
      content: f.content,
    }))
  );

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition':
        'attachment; filename="medinvent-php-mysql-calculator.zip"',
      'Content-Length': String(zipBuffer.length),
    },
  });
}
