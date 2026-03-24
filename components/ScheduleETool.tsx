'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Property, Transaction, RawTransaction } from '@/lib/types';
import {
  matchCategory,
  matchProperty,
  assignAllProperties,
  buildPropertySummaries,
  ALL_CATEGORIES,
  SCHEDULE_E_LINES,
} from '@/lib/categories';
import {
  getProperties,
  saveProperties,
  getLearnedRules,
  saveLearnedRules,
  getReports,
  saveReport,
  SavedReport,
} from '@/lib/storage';
import { exportExcel, exportCSV } from '@/lib/export';

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// Category → short colored label
const CAT_COLORS: Record<string, string> = {
  '3': 'bg-emerald-100 text-emerald-800',
  '5': 'bg-purple-100 text-purple-800',
  '7': 'bg-sky-100 text-sky-800',
  '9': 'bg-indigo-100 text-indigo-800',
  '10': 'bg-violet-100 text-violet-800',
  '11': 'bg-cyan-100 text-cyan-800',
  '12': 'bg-rose-100 text-rose-800',
  '14': 'bg-orange-100 text-orange-800',
  '15': 'bg-amber-100 text-amber-800',
  '16': 'bg-red-100 text-red-800',
  '17': 'bg-blue-100 text-blue-800',
  '19': 'bg-gray-100 text-gray-700',
};

function getCatLine(category: string): string {
  const m = category.match(/^Line (\d+)/);
  return m ? m[1] : '19';
}

export default function ScheduleETool() {
  const [properties, setPropertiesState] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [view, setView] = useState<'upload' | 'review'>('upload');
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState('');
  const [showProps, setShowProps] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [flash, setFlash] = useState('');
  const [visibleCount, setVisibleCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = getProperties();
    setPropertiesState(saved);
  }, []);

  // Animate transactions appearing one by one
  useEffect(() => {
    if (view === 'review' && visibleCount < transactions.length) {
      const timer = setTimeout(() => {
        setVisibleCount((c) => Math.min(c + 3, transactions.length));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [view, visibleCount, transactions.length]);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 6000);
  }, []);

  // ── Properties ────────────────────────────────────────────────────────────

  const updateProperties = (props: Property[]) => {
    setPropertiesState(props);
    saveProperties(props);
  };

  const addProperty = () => {
    updateProperties([
      ...properties,
      { id: genId(), address: '', type: 'Multi-Family', units: 2 },
    ]);
  };

  const removeProperty = (id: string) => {
    updateProperties(properties.filter((p) => p.id !== id));
  };

  const updateProp = (id: string, field: keyof Property, value: string | number) => {
    updateProperties(
      properties.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showFlash('Please upload a PDF file.');
      return;
    }

    setLoading(true);
    setTransactions([]);
    setVisibleCount(0);
    setShowSummary(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/parse', { method: 'POST', body: formData });
      const json = await res.json();

      if (!res.ok) {
        showFlash(json.error || 'Failed to parse PDF.');
        setLoading(false);
        return;
      }

      const raw: RawTransaction[] = json.transactions;
      const rules = getLearnedRules();
      const addrs = properties.map((p) => p.address);

      let categorized: Transaction[] = raw.map((txn, i) => {
        const category =
          matchCategory(txn.description, rules) ||
          (txn.amount > 0 ? 'Line 3: Rents received' : 'Line 19: Other');
        const { property, confidence } = matchProperty(txn.description, addrs);
        return {
          ...txn,
          id: String(i),
          category,
          property: property || '',
          confidence: confidence || '',
          autoMatched: true,
        };
      });

      if (properties.length > 0) {
        categorized = assignAllProperties(categorized, properties);
      }

      setTransactions(categorized);
      setFilename(file.name);
      setView('review');

      const incomeCount = categorized.filter((t) => t.amount > 0).length;
      const expenseCount = categorized.filter((t) => t.amount < 0).length;
      showFlash(
        `Extracted ${raw.length} transactions: ${incomeCount} income, ${expenseCount} expenses`
      );
    } catch {
      showFlash('Error parsing PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Edits ─────────────────────────────────────────────────────────────────

  const handleCategoryChange = (id: string, newCat: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const rules = getLearnedRules();
          rules[t.description.trim()] = newCat;
          saveLearnedRules(rules);
          return { ...t, category: newCat };
        }
        return t;
      })
    );
  };

  // ── Summaries & Export ────────────────────────────────────────────────────

  const summaries =
    transactions.length > 0 ? buildPropertySummaries(transactions, properties) : {};

  // Compute simple category totals (across all properties)
  const categoryTotals: Record<string, number> = {};
  for (const txn of transactions) {
    const line = getCatLine(txn.category);
    categoryTotals[line] = (categoryTotals[line] || 0) + txn.amount;
  }

  const totalIncome = categoryTotals['3'] || 0;
  const totalExpenses = Object.entries(categoryTotals)
    .filter(([k]) => k !== '3')
    .reduce((s, [, v]) => s + v, 0);

  const handleExportExcel = async () => { await exportExcel(transactions, summaries, filename); };
  const handleExportCSV = () => exportCSV(transactions, summaries, filename);

  const handleSaveReport = () => {
    saveReport({
      id: genId(),
      label: filename.replace(/\.pdf$/i, ''),
      filename,
      transactions,
      savedAt: new Date().toISOString(),
    });
    showFlash('Report saved.');
  };

  const handleLoadReport = (report: SavedReport) => {
    setTransactions(report.transactions);
    setFilename(report.filename);
    setVisibleCount(report.transactions.length);
    setView('review');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">ScheduleEHelper</h1>
            <p className="text-xs text-gray-500">
              Upload bank statement &rarr; categorized transactions &rarr; Schedule E
            </p>
          </div>
          <div className="flex gap-2">
            {properties.length > 0 && (
              <button
                onClick={() => setShowProps(!showProps)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                Properties ({properties.length})
              </button>
            )}
            {view === 'review' && (
              <button
                onClick={() => { setView('upload'); setShowSummary(false); }}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                &larr; New Upload
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Flash */}
      {flash && (
        <div className="max-w-4xl mx-auto px-4 mt-3">
          <div className="bg-emerald-900/50 border border-emerald-700 text-emerald-300 px-4 py-2 rounded-lg text-sm">
            {flash}
          </div>
        </div>
      )}

      {/* Property panel */}
      {showProps && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm text-gray-300">Your Rental Properties</h2>
              <button onClick={addProperty} className="text-xs px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500">
                + Add
              </button>
            </div>
            {properties.length === 0 ? (
              <p className="text-sm text-gray-600 py-4 text-center">
                No properties yet. Add your rentals to enable property-level reports.
              </p>
            ) : (
              <div className="space-y-2">
                {properties.map((p) => (
                  <div key={p.id} className="flex gap-2 items-center">
                    <input
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                      placeholder="Address"
                      value={p.address}
                      onChange={(e) => updateProp(p.id, 'address', e.target.value)}
                    />
                    <input
                      className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-emerald-500"
                      type="number"
                      min={1}
                      placeholder="Units"
                      value={p.units}
                      onChange={(e) => updateProp(p.id, 'units', parseInt(e.target.value) || 1)}
                    />
                    <button
                      onClick={() => removeProperty(p.id)}
                      className="text-gray-600 hover:text-red-400 px-1 text-lg"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setShowProps(false)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {view === 'upload' ? (
          <>
            {/* Upload area */}
            <div
              className={`border-2 border-dashed rounded-xl p-20 text-center transition-all cursor-pointer ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-950/30'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-600'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
              />
              {loading ? (
                <div>
                  <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-400">Extracting transactions...</p>
                </div>
              ) : (
                <div>
                  <div className="text-5xl mb-4 opacity-30">&#128196;</div>
                  <p className="text-lg font-medium text-gray-300 mb-1">
                    Drop your bank statement PDF
                  </p>
                  <p className="text-sm text-gray-600">
                    Transactions will be extracted and categorized for Schedule E
                  </p>
                </div>
              )}
            </div>

            {/* Setup prompt */}
            {properties.length === 0 && (
              <button
                onClick={() => setShowProps(true)}
                className="mt-4 w-full text-left bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
              >
                <p className="text-sm font-medium text-gray-300">Optional: Add your properties</p>
                <p className="text-xs text-gray-600 mt-1">
                  Enable per-property Schedule E breakdowns by adding your rental addresses
                </p>
              </button>
            )}

            <SavedReports onLoad={handleLoadReport} />
          </>
        ) : (
          <>
            {/* ── Transaction Log ──────────────────────────────────────── */}

            {/* Top bar */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-mono text-gray-500">{filename}</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  {transactions.length} transactions &middot; Income:{' '}
                  <span className="text-emerald-400">{fmt(totalIncome)}</span> &middot;
                  Expenses:{' '}
                  <span className="text-red-400">{fmt(totalExpenses)}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveReport} className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors">
                  Save
                </button>
                <button onClick={handleExportCSV} className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors">
                  CSV
                </button>
                <button onClick={handleExportExcel} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">
                  Export Excel
                </button>
              </div>
            </div>

            {/* Transaction log */}
            <div className="space-y-1">
              {transactions.slice(0, visibleCount).map((txn, i) => {
                const lineNum = getCatLine(txn.category);
                const colorClass = CAT_COLORS[lineNum] || CAT_COLORS['19'];
                const isIncome = txn.amount > 0;

                return (
                  <div
                    key={txn.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 hover:border-gray-700 transition-all animate-in"
                    style={{ animationDelay: `${i * 20}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: date + description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-gray-500 shrink-0">
                            {txn.date}
                          </span>
                          <span className="text-sm text-gray-200 truncate" title={txn.description}>
                            {txn.description}
                          </span>
                        </div>
                        {/* Category row */}
                        <div className="flex items-center gap-2 mt-1.5 ml-[4.5rem]">
                          <span className="text-gray-600 text-xs">&rarr;</span>
                          <select
                            value={txn.category}
                            onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer ${colorClass} focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                          >
                            {ALL_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          {txn.property && (
                            <span className="text-xs text-gray-600">
                              @ {txn.property}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Right: amount */}
                      <span
                        className={`text-sm font-mono font-semibold tabular-nums shrink-0 ${
                          isIncome ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isIncome ? '+' : ''}{fmt(txn.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Loading indicator for animation */}
            {visibleCount < transactions.length && (
              <div className="text-center py-4">
                <div className="animate-pulse text-gray-600 text-sm">
                  Loading transactions... ({visibleCount}/{transactions.length})
                </div>
              </div>
            )}

            {/* Schedule E Summary toggle */}
            {visibleCount >= transactions.length && transactions.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowSummary(!showSummary)}
                  className="w-full text-left bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Schedule E Summary</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Net Income:{' '}
                        <span
                          className={
                            totalIncome + totalExpenses >= 0
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }
                        >
                          {fmt(totalIncome + totalExpenses)}
                        </span>
                      </p>
                    </div>
                    <span className="text-gray-600">{showSummary ? '▲' : '▼'}</span>
                  </div>
                </button>

                {showSummary && (
                  <div className="mt-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">
                            Line
                          </th>
                          <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">
                            Category
                          </th>
                          <th className="px-4 py-2 text-right text-xs text-gray-500 font-medium">
                            Amount
                          </th>
                          <th className="px-4 py-2 text-right text-xs text-gray-500 font-medium">
                            Count
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {SCHEDULE_E_LINES.filter(([num]) => categoryTotals[num]).map(
                          ([num, name]) => {
                            const val = categoryTotals[num];
                            const count = transactions.filter(
                              (t) => getCatLine(t.category) === num
                            ).length;
                            const colorClass = CAT_COLORS[num] || CAT_COLORS['19'];
                            return (
                              <tr
                                key={num}
                                className="border-b border-gray-800/50 hover:bg-gray-800/30"
                              >
                                <td className="px-4 py-2 text-gray-500 font-mono text-xs">
                                  {num}
                                </td>
                                <td className="px-4 py-2">
                                  <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}
                                  >
                                    {name}
                                  </span>
                                </td>
                                <td
                                  className={`px-4 py-2 text-right font-mono tabular-nums ${
                                    val > 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}
                                >
                                  {fmt(val)}
                                </td>
                                <td className="px-4 py-2 text-right text-gray-600 text-xs">
                                  {count}
                                </td>
                              </tr>
                            );
                          }
                        )}
                        <tr className="bg-gray-800/50">
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 font-bold text-white text-sm">
                            NET INCOME
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-mono font-bold tabular-nums ${
                              totalIncome + totalExpenses >= 0
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }`}
                          >
                            {fmt(totalIncome + totalExpenses)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 text-xs">
                            {transactions.length}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Saved Reports ───────────────────────────────────────────────────────────

function SavedReports({ onLoad }: { onLoad: (r: SavedReport) => void }) {
  const [reports, setReports] = useState<SavedReport[]>([]);

  useEffect(() => {
    setReports(getReports());
  }, []);

  if (reports.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-500 mb-2">Saved Reports</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => onLoad(r)}
            className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-left hover:border-gray-600 transition-colors"
          >
            <p className="font-medium text-sm text-gray-300">{r.label}</p>
            <p className="text-xs text-gray-600">
              {r.transactions.length} transactions &middot;{' '}
              {new Date(r.savedAt).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
