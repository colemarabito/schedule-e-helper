import writeXlsxFile from 'write-excel-file/browser';
import { Transaction, PropertySummary } from './types';
import { SCHEDULE_E_LINES } from './categories';

// ── Cell helpers ────────────────────────────────────────────────────────────

type Cell = {
  value: string | number | boolean | null | undefined;
  type?: typeof String | typeof Number;
  fontWeight?: 'bold';
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
};

type Row = Cell[];

const greenHdr = (value: string): Cell => ({
  value,
  fontWeight: 'bold',
  backgroundColor: '#2CA01C',
  color: '#FFFFFF',
});

const boldCell = (value: string | number | null): Cell => ({
  value,
  fontWeight: 'bold',
});

function padRow(row: Row, cols: number): Row {
  while (row.length < cols) row.push({ value: null });
  return row;
}

// ── Excel Export ────────────────────────────────────────────────────────────

export async function exportExcel(
  transactions: Transaction[],
  summaries: Record<string, PropertySummary>,
  filename: string
) {
  const props = Object.keys(summaries);
  const allSheets: Row[][] = [];
  const sheetNames: string[] = [];
  const allColumns: { width: number }[][] = [];

  // ── Summary sheet ─────────────────────────────────────────────────────
  const sumCols = 2 + props.length + 1;
  const sumRows: Row[] = [];

  sumRows.push(
    padRow(
      [
        greenHdr('Line'),
        greenHdr('Description'),
        ...props.map((p) => greenHdr(p.length > 20 ? p.slice(0, 18) + '...' : p)),
        greenHdr('Total'),
      ],
      sumCols
    )
  );

  for (const [lineNum, lineName] of SCHEDULE_E_LINES) {
    const row: Row = [
      { value: parseInt(lineNum), type: Number },
      { value: lineName },
    ];
    let total = 0;
    for (const prop of props) {
      const val = summaries[prop].scheduleE[lineNum] || 0;
      row.push({ value: val || null, type: Number });
      total += val;
    }
    row.push({ value: total || null, type: Number });
    sumRows.push(padRow(row, sumCols));
  }

  sumRows.push(padRow([], sumCols));

  const netRow: Row = [{ value: null }, boldCell('NET INCOME (Line 21)')];
  for (const prop of props) {
    const income = summaries[prop].scheduleE['3'] || 0;
    const expenses = Object.entries(summaries[prop].scheduleE)
      .filter(([k]) => k !== '3')
      .reduce((s, [, v]) => s + v, 0);
    netRow.push({ value: income + expenses, type: Number, fontWeight: 'bold' });
  }
  const totalIncome = props.reduce((s, p) => s + (summaries[p].scheduleE['3'] || 0), 0);
  const totalExp = props.reduce(
    (s, p) =>
      s +
      Object.entries(summaries[p].scheduleE)
        .filter(([k]) => k !== '3')
        .reduce((ss, [, v]) => ss + v, 0),
    0
  );
  netRow.push({ value: totalIncome + totalExp, type: Number, fontWeight: 'bold' });
  sumRows.push(padRow(netRow, sumCols));

  allSheets.push(sumRows);
  sheetNames.push('Schedule E Summary');
  allColumns.push([
    { width: 6 },
    { width: 35 },
    ...props.map(() => ({ width: 15 })),
    { width: 15 },
  ]);

  // ── Per-property sheets ───────────────────────────────────────────────
  const propCols = 5;

  for (const [prop, data] of Object.entries(summaries)) {
    const rows: Row[] = [];
    rows.push(padRow([boldCell(`Schedule E - ${prop}`)], propCols));
    rows.push(padRow([], propCols));
    rows.push(padRow([boldCell('Line'), boldCell('Category'), boldCell('Amount')], propCols));

    let propIncome = 0;
    let propExpenses = 0;
    for (const [lineNum, lineName] of SCHEDULE_E_LINES) {
      const val = data.scheduleE[lineNum] || 0;
      if (val) {
        rows.push(
          padRow(
            [
              { value: parseInt(lineNum), type: Number },
              { value: lineName },
              { value: val, type: Number },
            ],
            propCols
          )
        );
        if (lineNum === '3') propIncome = val;
        else propExpenses += val;
      }
    }

    rows.push(padRow([], propCols));
    rows.push(
      padRow(
        [
          { value: null },
          boldCell('NET INCOME'),
          { value: propIncome + propExpenses, type: Number, fontWeight: 'bold' },
        ],
        propCols
      )
    );
    rows.push(padRow([], propCols));
    rows.push(padRow([], propCols));
    rows.push([
      greenHdr('Date'),
      greenHdr('Description'),
      greenHdr('Amount'),
      greenHdr('Category'),
      greenHdr('Confidence'),
    ]);

    for (const txn of data.transactions) {
      rows.push([
        { value: txn.date },
        { value: txn.description },
        { value: txn.amount, type: Number },
        { value: txn.category },
        { value: txn.confidence || '' },
      ]);
    }

    allSheets.push(rows);
    sheetNames.push(prop.slice(0, 28).replace(/\//g, '-'));
    allColumns.push([
      { width: 12 },
      { width: 40 },
      { width: 15 },
      { width: 30 },
      { width: 12 },
    ]);
  }

  const baseName = filename.replace(/\.pdf$/i, '');
  // write-excel-file uses loose types internally; cast to satisfy its overloads
  await writeXlsxFile(allSheets as Parameters<typeof writeXlsxFile>[0], {
    sheets: sheetNames,
    columns: allColumns,
    fileName: `${baseName}_schedule_e.xlsx`,
  });
}

// ── CSV Export ──────────────────────────────────────────────────────────────

export function exportCSV(
  transactions: Transaction[],
  summaries: Record<string, PropertySummary>,
  filename: string
) {
  const props = Object.keys(summaries);
  const rows: string[][] = [];

  rows.push(['Schedule E Summary', ...Array(props.length).fill('')]);
  rows.push(['Line', 'Description', ...props, 'Total']);

  for (const [lineNum, lineName] of SCHEDULE_E_LINES) {
    const row = [lineNum, lineName];
    let total = 0;
    for (const prop of props) {
      const val = summaries[prop].scheduleE[lineNum] || 0;
      row.push(val ? val.toFixed(2) : '');
      total += val;
    }
    row.push(total ? total.toFixed(2) : '');
    rows.push(row);
  }

  rows.push([]);
  rows.push([]);
  rows.push(['All Transactions']);
  rows.push(['Date', 'Description', 'Amount', 'Category', 'Property', 'Confidence']);
  for (const txn of transactions) {
    rows.push([
      txn.date,
      txn.description,
      txn.amount.toFixed(2),
      txn.category,
      txn.property,
      txn.confidence,
    ]);
  }

  const csvEscape = (s: string): string => {
    let escaped = String(s).replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(escaped)) escaped = "'" + escaped;
    return `"${escaped}"`;
  };
  const csvContent = rows.map((r) => r.map((c) => csvEscape(c)).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/\.pdf$/i, '')}_schedule_e.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
