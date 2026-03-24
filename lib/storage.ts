import { Property, Transaction } from './types';

const PROPERTIES_KEY = 'schedule_e_properties';
const RULES_KEY = 'schedule_e_rules';
const REPORTS_KEY = 'schedule_e_reports';

// ── Properties ──────────────────────────────────────────────────────────────

export function getProperties(): Property[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(PROPERTIES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveProperties(properties: Property[]): void {
  localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
}

// ── Learned Rules ───────────────────────────────────────────────────────────

export function getLearnedRules(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const data = localStorage.getItem(RULES_KEY);
  return data ? JSON.parse(data) : {};
}

export function saveLearnedRules(rules: Record<string, string>): void {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function deleteLearnedRule(pattern: string): void {
  const rules = getLearnedRules();
  delete rules[pattern];
  saveLearnedRules(rules);
}

// ── Saved Reports ───────────────────────────────────────────────────────────

export interface SavedReport {
  id: string;
  label: string;
  filename: string;
  transactions: Transaction[];
  savedAt: string;
}

export function getReports(): SavedReport[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(REPORTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveReport(report: SavedReport): void {
  const reports = getReports();
  const idx = reports.findIndex((r) => r.id === report.id);
  if (idx >= 0) reports[idx] = report;
  else reports.push(report);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

export function deleteReport(id: string): void {
  const reports = getReports().filter((r) => r.id !== id);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}
