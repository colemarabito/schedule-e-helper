import { Property, Transaction, PropertySummary } from './types';

// ── Schedule E Line Items ───────────────────────────────────────────────────

export const SCHEDULE_E_LINES: [string, string][] = [
  ['3', 'Rents received'],
  ['5', 'Advertising'],
  ['6', 'Auto and travel'],
  ['7', 'Cleaning and maintenance'],
  ['8', 'Commissions'],
  ['9', 'Insurance'],
  ['10', 'Legal and other professional fees'],
  ['11', 'Management fees'],
  ['12', 'Mortgage interest paid to banks, etc.'],
  ['13', 'Other interest'],
  ['14', 'Repairs'],
  ['15', 'Supplies'],
  ['16', 'Taxes'],
  ['17', 'Utilities'],
  ['18', 'Depreciation expense or depletion'],
  ['19', 'Other'],
];

export const ALL_CATEGORIES = SCHEDULE_E_LINES.map(
  ([num, name]) => `Line ${num}: ${name}`
);

// ── Raw category → Schedule E line mapping ──────────────────────────────────

const SCHEDULE_E_MAP: Record<string, [string, string]> = {
  'Rental Income': ['3', 'Rents received'],
  'Advertising': ['5', 'Advertising'],
  'Cleaning & Turnover': ['7', 'Cleaning and maintenance'],
  'Landscaping': ['7', 'Cleaning and maintenance'],
  'Insurance': ['9', 'Insurance'],
  'Legal & Professional Fees': ['10', 'Legal and other professional fees'],
  'Property Management Fees': ['11', 'Management fees'],
  'Mortgage Payment': ['12', 'Mortgage interest paid to banks, etc.'],
  'Mortgage Interest': ['12', 'Mortgage interest paid to banks, etc.'],
  'Repairs & Maintenance': ['14', 'Repairs'],
  'Supplies': ['15', 'Supplies'],
  'Property Taxes': ['16', 'Taxes'],
  'Utilities': ['17', 'Utilities'],
  'Other Expense': ['19', 'Other'],
  'Bank Fees': ['19', 'Other'],
  'Capital Expenditure': ['19', 'Other'],
  'Owner Draw': ['19', 'Other'],
  'Owner Contribution': ['3', 'Rents received'],
  'Transfer': ['19', 'Other'],
};

// ── Built-in keyword rules ──────────────────────────────────────────────────
// Order matters: more specific patterns first, broader patterns later.

const BUILTIN_RULES: [string, string][] = [
  // ── Rental income ─────────────────────────────────────────────────────────
  ['zg - your rentalrent', 'Rental Income'],
  ['zg your rentalrent', 'Rental Income'],
  ['zg - your rental', 'Rental Income'],
  ['rentalrent', 'Rental Income'],
  ['zego', 'Rental Income'],
  ['paylease', 'Rental Income'],
  ['rent payment', 'Rental Income'],
  ['rent pmt', 'Rental Income'],
  ['tenant payment', 'Rental Income'],
  ['tenant pmt', 'Rental Income'],
  ['section 8', 'Rental Income'],
  ['housing authority', 'Rental Income'],
  ['housing auth', 'Rental Income'],
  ['hap ', 'Rental Income'],
  ['month hap', 'Rental Income'],
  ['portage metro hs', 'Rental Income'],
  ['mobile check deposit', 'Rental Income'],
  ['deposit branch', 'Rental Income'],
  ['deposit    branch', 'Rental Income'],
  ['interest payment', 'Rental Income'],
  ['interest earned', 'Rental Income'],

  // ── Mortgage / Loan (Line 12) ─────────────────────────────────────────────
  ['mortgage', 'Mortgage Payment'],
  ['loan pmt', 'Mortgage Payment'],
  ['loan pay', 'Mortgage Payment'],
  ['loan payment', 'Mortgage Payment'],
  ['mtg pmt', 'Mortgage Payment'],
  ['mtg pay', 'Mortgage Payment'],
  ['home loan', 'Mortgage Payment'],
  ['escrow', 'Mortgage Payment'],

  // ── Repairs & Maintenance (Line 14) ───────────────────────────────────────
  ['home depot', 'Repairs & Maintenance'],
  ['lowes', 'Repairs & Maintenance'],
  ["lowe's", 'Repairs & Maintenance'],
  ['ace hardware', 'Repairs & Maintenance'],
  ['menards', 'Repairs & Maintenance'],
  ['true value', 'Repairs & Maintenance'],
  ['harbor freight', 'Repairs & Maintenance'],
  ['plumb', 'Repairs & Maintenance'],
  ['hvac', 'Repairs & Maintenance'],
  ['heating', 'Repairs & Maintenance'],
  ['cooling', 'Repairs & Maintenance'],
  ['furnace', 'Repairs & Maintenance'],
  ['air condition', 'Repairs & Maintenance'],
  ['repair', 'Repairs & Maintenance'],
  ['handyman', 'Repairs & Maintenance'],
  ['maintenance', 'Repairs & Maintenance'],
  ['appliance', 'Repairs & Maintenance'],
  ['roofing', 'Repairs & Maintenance'],
  ['roofer', 'Repairs & Maintenance'],
  ['electrician', 'Repairs & Maintenance'],
  ['electric service', 'Repairs & Maintenance'],
  ['drywall', 'Repairs & Maintenance'],
  ['painter', 'Repairs & Maintenance'],
  ['painting', 'Repairs & Maintenance'],
  ['flooring', 'Repairs & Maintenance'],
  ['carpet install', 'Repairs & Maintenance'],
  ['locksmith', 'Repairs & Maintenance'],
  ['pest control', 'Repairs & Maintenance'],
  ['exterminator', 'Repairs & Maintenance'],
  ['terminix', 'Repairs & Maintenance'],
  ['orkin', 'Repairs & Maintenance'],

  // ── Utilities (Line 17) ───────────────────────────────────────────────────
  ['dp&l', 'Utilities'],
  ['dpl ', 'Utilities'],
  ['dayton power', 'Utilities'],
  ['duke energy', 'Utilities'],
  ['vectren', 'Utilities'],
  ['vectrenenergy', 'Utilities'],
  ['water department', 'Utilities'],
  ['water dept', 'Utilities'],
  ['water dist', 'Utilities'],
  ['city of dayton', 'Utilities'],
  ['utility', 'Utilities'],
  ['utilitypmt', 'Utilities'],
  ['sewer', 'Utilities'],
  ['enbridge gas', 'Utilities'],
  ['first energy', 'Utilities'],
  ['firstenergy', 'Utilities'],
  ['portage electrical', 'Utilities'],
  ['spectrum', 'Utilities'],
  ['village of marb', 'Utilities'],
  ['ravenna', 'Utilities'],
  ['portage cnty', 'Utilities'],
  ['electric', 'Utilities'],
  ['gas bill', 'Utilities'],
  ['nat gas', 'Utilities'],
  ['natural gas', 'Utilities'],
  ['consumer energy', 'Utilities'],
  ['consumers energy', 'Utilities'],
  ['pacific gas', 'Utilities'],
  ['pg&e', 'Utilities'],
  ['con edison', 'Utilities'],
  ['comed', 'Utilities'],
  ['dominion energy', 'Utilities'],
  ['atmos energy', 'Utilities'],
  ['centerpoint', 'Utilities'],
  ['xcel energy', 'Utilities'],
  ['entergy', 'Utilities'],
  ['ameren', 'Utilities'],
  ['pepco', 'Utilities'],
  ['eversource', 'Utilities'],
  ['national grid', 'Utilities'],
  ['trash', 'Utilities'],
  ['waste manage', 'Utilities'],
  ['republic service', 'Utilities'],
  ['garbage', 'Utilities'],
  ['sanitation', 'Utilities'],
  ['internet', 'Utilities'],
  ['comcast', 'Utilities'],
  ['xfinity', 'Utilities'],
  ['att ', 'Utilities'],
  ['at&t', 'Utilities'],
  ['t-mobile', 'Utilities'],
  ['verizon', 'Utilities'],

  // ── Insurance (Line 9) ────────────────────────────────────────────────────
  ['insurance', 'Insurance'],
  ['state farm', 'Insurance'],
  ['allstate', 'Insurance'],
  ['erie ins', 'Insurance'],
  ['progressive', 'Insurance'],
  ['nationwide', 'Insurance'],
  ['geico', 'Insurance'],
  ['farmers ins', 'Insurance'],
  ['liberty mutual', 'Insurance'],
  ['travelers', 'Insurance'],
  ['usaa', 'Insurance'],
  ['safeco', 'Insurance'],
  ['hartford', 'Insurance'],
  ['premium', 'Insurance'],

  // ── Property Management (Line 11) ─────────────────────────────────────────
  ['property manage', 'Property Management Fees'],
  ['management fee', 'Property Management Fees'],
  ['mgmt fee', 'Property Management Fees'],
  ['prop mgmt', 'Property Management Fees'],

  // ── Landscaping / Cleaning (Line 7) ───────────────────────────────────────
  ['landscap', 'Landscaping'],
  ['lawn', 'Landscaping'],
  ['mowing', 'Landscaping'],
  ['tree service', 'Landscaping'],
  ['tree trim', 'Landscaping'],
  ['snow removal', 'Landscaping'],
  ['snow plow', 'Landscaping'],
  ['cleaning', 'Cleaning & Turnover'],
  ['janitorial', 'Cleaning & Turnover'],
  ['carpet clean', 'Cleaning & Turnover'],
  ['maid', 'Cleaning & Turnover'],
  ['turnover', 'Cleaning & Turnover'],

  // ── Legal & Professional (Line 10) ────────────────────────────────────────
  ['attorney', 'Legal & Professional Fees'],
  ['lawyer', 'Legal & Professional Fees'],
  ['law firm', 'Legal & Professional Fees'],
  ['law office', 'Legal & Professional Fees'],
  ['legal', 'Legal & Professional Fees'],
  ['accountant', 'Legal & Professional Fees'],
  ['cpa', 'Legal & Professional Fees'],
  ['tax prep', 'Legal & Professional Fees'],
  ['eviction', 'Legal & Professional Fees'],
  ['court', 'Legal & Professional Fees'],
  ['filing fee', 'Legal & Professional Fees'],
  ['title company', 'Legal & Professional Fees'],

  // ── Advertising (Line 5) ──────────────────────────────────────────────────
  ['zillow', 'Advertising'],
  ['apartments.com', 'Advertising'],
  ['craigslist', 'Advertising'],
  ['facebook', 'Advertising'],
  ['trulia', 'Advertising'],
  ['hotpads', 'Advertising'],
  ['realtor.com', 'Advertising'],
  ['rent.com', 'Advertising'],
  ['cozy', 'Advertising'],
  ['avail', 'Advertising'],
  ['turbotenant', 'Advertising'],

  // ── Supplies (Line 15) ────────────────────────────────────────────────────
  ['office depot', 'Supplies'],
  ['staples', 'Supplies'],
  ['amazon', 'Supplies'],
  ['walmart', 'Supplies'],
  ['target', 'Supplies'],
  ['dollar general', 'Supplies'],
  ['dollar tree', 'Supplies'],
  ['family dollar', 'Supplies'],
  ['costco', 'Supplies'],
  ['sams club', 'Supplies'],
  ["sam's club", 'Supplies'],

  // ── Taxes (Line 16) ──────────────────────────────────────────────────────
  ['county treasurer', 'Property Taxes'],
  ['montgomery county', 'Property Taxes'],
  ['tax bill', 'Property Taxes'],
  ['property tax', 'Property Taxes'],
  ['tax collector', 'Property Taxes'],
  ['assessor', 'Property Taxes'],
  ['tax payment', 'Property Taxes'],

  // ── Auto & Travel (Line 6) ───────────────────────────────────────────────
  ['gas station', 'Other Expense'],
  ['shell oil', 'Other Expense'],
  ['speedway', 'Other Expense'],
  ['bp ', 'Other Expense'],
  ['chevron', 'Other Expense'],
  ['mileage', 'Other Expense'],

  // ── Credit card / Bank payments ───────────────────────────────────────────
  // These go last — they are "Other" but we still want to match them
  // so they don't fall through to the keyword guesser
  ['crdtcardautopay', 'Other Expense'],
  ['keybank crdtcard', 'Other Expense'],
  ['crdtcard', 'Other Expense'],
  ['ccpymt', 'Other Expense'],
  ['cc pymt', 'Other Expense'],
  ['cc pmt', 'Other Expense'],
  ['cc payment', 'Other Expense'],
  ['credit card', 'Other Expense'],
  ['card payment', 'Other Expense'],
  ['cardpayment', 'Other Expense'],
  ['onlinepayment', 'Other Expense'],
  ['online pmt', 'Other Expense'],
  ['online pay', 'Other Expense'],
  ['autopay', 'Other Expense'],
  ['bill pay', 'Other Expense'],
  ['billpay', 'Other Expense'],
  ['venmo', 'Other Expense'],
  ['zelle', 'Other Expense'],
  ['cashapp', 'Other Expense'],
  ['cash app', 'Other Expense'],
  ['paypal', 'Other Expense'],
  ['coinbase', 'Other Expense'],
  ['robinhood', 'Other Expense'],
  ['wells fargo card', 'Other Expense'],
  ['citi card', 'Other Expense'],
  ['chase card', 'Other Expense'],
  ['chase credit', 'Other Expense'],
  ['capital one', 'Other Expense'],
  ['discover card', 'Other Expense'],
  ['amex', 'Other Expense'],
  ['rwrd rdm', 'Other Expense'],
  ['reward', 'Other Expense'],
  ['cashback', 'Other Expense'],
  ['cash back', 'Other Expense'],
  ['check #', 'Other Expense'],
  ['internet trf', 'Transfer'],
  ['trf fr dda', 'Transfer'],
  ['trf to dda', 'Transfer'],
  ['transfer fr', 'Transfer'],
  ['transfer to', 'Transfer'],
  ['xfer', 'Transfer'],
  ['ach dr', 'Other Expense'],
  ['ach credit', 'Other Expense'],
  ['payment', 'Other Expense'],
  ['pmt', 'Other Expense'],
];

// ── Categorization ──────────────────────────────────────────────────────────

function toScheduleE(rawCategory: string): string | null {
  const entry = SCHEDULE_E_MAP[rawCategory];
  if (entry) return `Line ${entry[0]}: ${entry[1]}`;
  return null;
}

// Keyword-based fallback guesser for transactions that don't match any rule.
// Looks for individual keywords that strongly suggest a Schedule E category.
const KEYWORD_GUESSES: [RegExp, string][] = [
  // Mortgage / Loan keywords
  [/\bloan\b/, 'Mortgage Payment'],
  [/\bmtg\b/, 'Mortgage Payment'],
  [/\bprincipal\b/, 'Mortgage Payment'],

  // Utility keywords
  [/\bgas\b/, 'Utilities'],
  [/\bwater\b/, 'Utilities'],
  [/\belectric\b/, 'Utilities'],
  [/\bpower\b/, 'Utilities'],
  [/\benergy\b/, 'Utilities'],

  // Insurance keywords
  [/\bins\b/, 'Insurance'],
  [/\bpolicy\b/, 'Insurance'],
  [/\bpremium\b/, 'Insurance'],

  // Repair keywords
  [/\bfix\b/, 'Repairs & Maintenance'],
  [/\binstall\b/, 'Repairs & Maintenance'],
  [/\bservice\b/, 'Repairs & Maintenance'],
  [/\bcontract/, 'Repairs & Maintenance'],

  // Supplies
  [/\bpurchase\b/, 'Supplies'],
  [/\bbuy\b/, 'Supplies'],
  [/\bsuppl/, 'Supplies'],

  // Tax
  [/\btax\b/, 'Property Taxes'],
];

export function matchCategory(
  description: string,
  learnedRules: Record<string, string>
): string | null {
  const descLower = description.toLowerCase();

  // Learned rules first (user corrections take priority)
  for (const [pattern, category] of Object.entries(learnedRules)) {
    if (descLower.includes(pattern.toLowerCase())) {
      return category;
    }
  }

  // Built-in rules (exact substring match)
  for (const [pattern, rawCat] of BUILTIN_RULES) {
    if (descLower.includes(pattern)) {
      return toScheduleE(rawCat) || rawCat;
    }
  }

  // Keyword-based fallback guessing
  for (const [regex, rawCat] of KEYWORD_GUESSES) {
    if (regex.test(descLower)) {
      return toScheduleE(rawCat) || rawCat;
    }
  }

  return null;
}

// ── Property matching ───────────────────────────────────────────────────────

export function matchProperty(
  description: string,
  propertyAddresses: string[]
): { property: string | null; confidence: 'strong' | 'medium' | null } {
  // STRONG: Address number in description via #NNNN or -NNNN pattern
  const numMatches = description.match(/[#-](\d{3,5})/g) || [];
  for (const m of numMatches) {
    const num = m.slice(1);
    for (const prop of propertyAddresses) {
      const addrParts = prop.split(' ')[0];
      if (addrParts.includes('-')) {
        const parts = addrParts.split('-');
        const start = parts[0];
        const end = start.slice(0, -parts[1].length) + parts[1];
        if (num === start || num === end) return { property: prop, confidence: 'strong' };
      } else {
        if (num === addrParts) return { property: prop, confidence: 'strong' };
      }
    }
  }

  // MEDIUM: Address number anywhere in description
  const descLower = description.toLowerCase();
  for (const prop of propertyAddresses) {
    const addrNum = prop.split(' ')[0].split('-')[0];
    if (descLower.includes(addrNum)) return { property: prop, confidence: 'medium' };
  }

  // MEDIUM: Street name in description
  for (const prop of propertyAddresses) {
    const parts = prop.split(' ');
    if (parts.length >= 2) {
      const street = parts[1].toLowerCase();
      if (street.length > 3 && descLower.includes(street)) {
        return { property: prop, confidence: 'medium' };
      }
    }
  }

  return { property: null, confidence: null };
}

// ── Assign all properties (split unmatched expenses) ────────────────────────

export function assignAllProperties(
  transactions: Transaction[],
  properties: Property[]
): Transaction[] {
  if (properties.length === 0) return transactions;

  const propAddresses = properties.map((p) => p.address);
  const totalUnits = properties.reduce((sum, p) => sum + (p.units || 1), 0);
  const unitWeights: Record<string, number> = {};
  for (const p of properties) {
    unitWeights[p.address] = (p.units || 1) / totalUnits;
  }

  const assigned: Transaction[] = [];
  const unmatched: Transaction[] = [];

  for (const txn of transactions) {
    if (txn.property && propAddresses.includes(txn.property)) {
      if (!txn.confidence) txn.confidence = 'strong';
      assigned.push(txn);
    } else {
      unmatched.push(txn);
    }
  }

  const stillUnmatched: Transaction[] = [];
  for (const txn of unmatched) {
    if (txn.amount > 0) {
      // Income with no match → assign to first property as weak
      assigned.push({ ...txn, property: propAddresses[0], confidence: 'weak' });
    } else {
      stillUnmatched.push(txn);
    }
  }

  // Split unmatched expenses proportionally by units
  for (const txn of stillUnmatched) {
    if (properties.length === 1) {
      assigned.push({ ...txn, property: propAddresses[0], confidence: 'weak' });
    } else {
      for (let i = 0; i < properties.length; i++) {
        const weight = unitWeights[properties[i].address];
        const splitAmount = Math.round(txn.amount * weight * 100) / 100;
        assigned.push({
          ...txn,
          id: `${txn.id}_split_${i}`,
          property: properties[i].address,
          confidence: 'split',
          amount: splitAmount,
          originalAmount: txn.amount,
        });
      }
    }
  }

  return assigned;
}

// ── Build per-property summaries ────────────────────────────────────────────

export function buildPropertySummaries(
  transactions: Transaction[],
  properties: Property[]
): Record<string, PropertySummary> {
  const propAddresses = properties.map((p) => p.address);
  const data: Record<string, PropertySummary> = {};

  for (const txn of transactions) {
    const prop = txn.property || propAddresses[0] || 'General';
    if (!data[prop]) data[prop] = { transactions: [], scheduleE: {} };
    data[prop].transactions.push(txn);

    if (txn.category?.startsWith('Line ')) {
      const lineNum = txn.category.split(':')[0].replace('Line ', '');
      data[prop].scheduleE[lineNum] = (data[prop].scheduleE[lineNum] || 0) + txn.amount;
    }
  }

  // Sort by property order
  const sorted: Record<string, PropertySummary> = {};
  for (const addr of propAddresses) {
    if (data[addr]) sorted[addr] = data[addr];
  }
  for (const addr of Object.keys(data)) {
    if (!sorted[addr]) sorted[addr] = data[addr];
  }

  return sorted;
}
