import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ScheduleEHelper — Landlord Tax Made Simple',
  description: 'Upload your bank statement PDF. Get your IRS Schedule E categorized automatically.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
