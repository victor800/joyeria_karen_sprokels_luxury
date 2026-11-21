import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/auth';
import Sidebar from '@/components/admin/Sidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect('/login');

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar email={admin.email} />
      <main className="flex-1 overflow-x-hidden p-6 md:p-8">{children}</main>
    </div>
  );
}
