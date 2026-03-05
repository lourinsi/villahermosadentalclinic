import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function Sidebar(props: any) {
  const { user } = useAuth();

  return (
    <aside className="...">
      {/* ...existing nav items... */}

      {/* admin-only links */}
      {user?.role === 'admin' && (
        <nav className="mt-6">
          <ul className="space-y-1">
            {/* ...other admin links... */}
            <li>
              <Link href="/admin/find-doctors" className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-gray-100">
                <span className="text-sm font-medium">Find Doctors</span>
              </Link>
            </li>
          </ul>
        </nav>
      )}

      {/* ...existing code... */}
    </aside>
  );
}