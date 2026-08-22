'use client';

import { useEffect, useState, useCallback } from 'react';

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string | null;
  last_login_at: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      setError('');
      const url = search ? '/api/admin/users?q=' + encodeURIComponent(search) : '/api/admin/users';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setUsers(data.users || []);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(q);
  };

  return (
    <div dir="rtl" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">إدارة المستخدمين</h1>
        <p className="text-sm text-zinc-400">إجمالي {users.length} مستخدم</p>
      </div>

      <form onSubmit={onSearch} className="flex gap-2 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث باسم المستخدم أو البريد..."
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900/50 px-2 py-0.5 text-xs text-white outline-none focus:border-slate-600"
        />
        <button type="submit" className="h-10 rounded-lg bg-green-700 px-4 text-white">بحث</button>
      </form>

      {loading && <p className="text-zinc-400 text-sm">جاري التحميل...</p>}
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-zinc-400 border-b border-zinc-800">
            <th className="text-right py-2 px-2">اسم المستخدم</th>
            <th className="text-right py-2 px-2">البريد الإلكتروني</th>
            <th className="text-right py-2 px-2">الدور</th>
            <th className="text-right py-2 px-2">تاريخ التسجيل</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && !loading && (
            <tr><td colSpan={4} className="py-8 text-center text-zinc-500">لا يوجد مستخدمين</td></tr>
          )}
          {users.map((u) => (
            <tr key={u.id} className="border-b border-zinc-900">
              <td className="py-2 px-2">{u.name || u.email.split('@')[0]}</td>
              <td className="py-2 px-2" dir="ltr">{u.email}</td>
              <td className="py-2 px-2">
                <span className={u.role === 'admin' ? 'text-green-400' : 'text-zinc-300'}>{u.role}</span>
              </td>
              <td className="py-2 px-2">{u.created_at || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
