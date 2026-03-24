import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface RawTransaction {
  date: string;
  description: string;
  amount: number;
}

function tryParseDate(s: string): string | null {
  if (!s) return null;
  s = s.trim();
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
    /^(\d{1,2})\/(\d{1,2})$/,
  ];

  for (const fmt of formats) {
    const m = s.match(fmt);
    if (m) {
      const month = m[1].padStart(2, '0');
      const day = m[2].padStart(2, '0');
      let year = m[3] || String(new Date().getFullYear());
      if (year.length === 2) year = '20' + year;
      return `${month}/${day}/${year}`;
    }
  }
  return null;
}

function tryParseAmount(s: string): number | null {
  if (!s) return null;
  let cleaned = s.replace(/[$,]/g, '').trim();
  const parenMatch = cleaned.match(/^\((.+)\)$/);
  if (parenMatch) cleaned = '-' + parenMatch[1];
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseTextLines(text: string): RawTransaction[] {
  const transactions: RawTransaction[] = [];
  let section: 'deposits' | 'withdrawals' | 'checks' | null = null;

  const patterns = [
    /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*(.+?)\$([\d,]+\.\d{2})\s*$/,
    /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(.+?)\s+\$?([\d,]+\.\d{2})\s*$/,
    /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\t+(.+?)\t+\$?([\d,]+\.\d{2})\s*$/,
  ];

  // Check patterns: both concatenated (pdf-parse) and spaced (pdfjs-dist) formats
  const checkPatterns = [
    /^(\d+)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+\$?([\d,]+\.\d{2})\s*$/,
    /^(\d+?)(\d{2}\/\d{2}(?:\/\d{2,4})?)\$([\d,]+\.\d{2})\s*$/,
  ];

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const lower = line.toLowerCase();

    if (lower.startsWith('total')) continue;
    if (lower.startsWith('page ')) continue;
    // Skip header rows (both concatenated and spaced variants)
    if (/^date\s*description\s*amount$/i.test(line)) continue;
    if (/^number\s*date\s*amount$/i.test(line)) continue;

    if (lower.match(/^deposits?\b/) || lower === 'deposits (money in)') {
      section = 'deposits';
      continue;
    }
    if (lower.match(/^(other\s+)?withdrawals?\b/) || lower === 'withdrawals (money out)') {
      section = 'withdrawals';
      continue;
    }
    if (lower.match(/^checks?\b/)) {
      section = 'checks';
      continue;
    }

    if (section === 'checks') {
      for (const cp of checkPatterns) {
        const cm = line.match(cp);
        if (cm) {
          const [, checkNum, dateStr, amtStr] = cm;
          const amount = -(Math.abs(tryParseAmount(amtStr) || 0));
          const date = tryParseDate(dateStr) || dateStr;
          transactions.push({ date, description: `Check #${checkNum}`, amount });
          break;
        }
      }
      // If a check pattern matched, skip to next line
      if (checkPatterns.some((cp) => cp.test(line))) continue;
    }

    for (const pattern of patterns) {
      const m = line.match(pattern);
      if (m) {
        const [, dateStr, desc, amtStr] = m;
        let amount = tryParseAmount(amtStr) || 0;
        if (section === 'withdrawals' || section === 'checks') {
          amount = -Math.abs(amount);
        }
        const date = tryParseDate(dateStr) || dateStr;
        transactions.push({ date, description: desc.trim(), amount });
        break;
      }
    }
  }

  return transactions;
}

// ── PDF text extraction using pdf-parse ──────────────────────────────────────

async function extractPdfText(
  buffer: Buffer
): Promise<{ text: string; numPages: number }> {
  const pdf = (await import('pdf-parse')).default;
  const data = await pdf(buffer);
  return { text: data.text, numPages: data.numpages };
}

// ── Route handler ───────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TEXT_LENGTH = 1_000_000;
const PARSE_TIMEOUT_MS = 30_000;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum 10 MB.' },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const header = buffer.slice(0, 5).toString();
    if (header !== '%PDF-') {
      return NextResponse.json(
        { error: 'Invalid file. Please upload a PDF.' },
        { status: 400 }
      );
    }

    const { text: rawText, numPages } = await Promise.race([
      extractPdfText(buffer),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), PARSE_TIMEOUT_MS)
      ),
    ]);

    const text = rawText.slice(0, MAX_TEXT_LENGTH);
    const transactions = parseTextLines(text);

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found. Try a different bank statement format.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ transactions, pageCount: numPages });
  } catch (err: unknown) {
    console.error('PDF parse error:', err);
    return NextResponse.json(
      {
        error:
          'Failed to parse PDF. The file may be corrupted or password-protected.',
      },
      { status: 500 }
    );
  }
}
