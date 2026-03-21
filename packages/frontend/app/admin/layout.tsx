import { Inter } from 'next/font/google';
import '@/app/globals.css';

import AdminAuthProvider from '@/components/admin/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={inter.className}>
      <AdminAuthProvider>
        <div className="min-h-screen bg-slate-50">
          {children}
        </div>
      </AdminAuthProvider>
    </div>
  );
}
