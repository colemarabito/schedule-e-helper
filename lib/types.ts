export interface Property {
  id: string;
  address: string;
  type: 'Single Family' | 'Multi-Family';
  units: number;
  monthlyRent?: number;
}

export interface RawTransaction {
  date: string;
  description: string;
  amount: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  property: string;
  confidence: 'strong' | 'medium' | 'weak' | 'split' | '';
  originalAmount?: number;
  autoMatched: boolean;
}

export interface PropertySummary {
  transactions: Transaction[];
  scheduleE: Record<string, number>;
}
