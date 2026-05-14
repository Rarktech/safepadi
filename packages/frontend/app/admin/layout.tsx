import { Inter } from 'next/font/google';
import '@/app/globals.css';

import AdminAuthProvider from '@/components/admin/AuthProvider';

const inter = Inter({ subsets: ['latin'], weight: ['700'] });

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} font-bold`}>
      <AdminAuthProvider>
        <div className="min-h-screen bg-slate-50">
          {children}
        </div>
      </AdminAuthProvider>
    </div>
  );
}
