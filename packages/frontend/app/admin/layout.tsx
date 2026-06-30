import { Inter, Inter_Tight } from 'next/font/google';
import '@/app/globals.css';
import AdminAuthProvider from '@/components/admin/AuthProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter-tight',
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${interTight.variable} font-sans`}>
      <AdminAuthProvider>
        {children}
      </AdminAuthProvider>
    </div>
  );
}
