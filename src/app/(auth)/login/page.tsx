'use client';

export default function LoginPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-3">تسجيل الدخول</h1>
        <p className="text-zinc-400 mb-6">الدخول إلى 4cima متاح عبر Google فقط حالياً</p>
        <button
          type="button"
          onClick={() => { window.location.href = '/api/auth/google'; }}
          className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-white text-black font-semibold py-3 hover:bg-zinc-100 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 11v2.4h5.36c-.24 1.36-1.1 2.5-2.42 3.06l2.06 1.6A7.48 7.48 0 0 0 19.5 12c0-.68-.1-1.34-.27-1.96L12 11z"/><path fill="#4285F4" d="M3.9 7.8A7.48 7.48 0 0 1 10.5 5c1.88 0 3.5.66 4.82 1.94l2-2A7.44 7.44 0 0 0 10.5 2a7.47 7.47 0 0 0-6.47 4.05L3.9 7.8z"/><path fill="#FBBC05" d="M12.3 18.5A6.48 6.48 0 0 1 5.3 14.2L3 16.2A7.48 7.48 0 0 0 10.5 22c1.92 0 3.56-.68 4.82-1.94l-2.06-1.6c-.81.55-1.86.85-2.96.85z"/><path fill="#34A853" d="M10.5 22a7.48 7.48 0 0 0 6.47-4.05l-2.46-1.9A6.48 6.48 0 0 1 3 11.96c0-1.66.6-3.18 1.27-4.36L2 5.7A7.47 7.47 0 0 0 10.5 22z"/></svg>
          المتابعة بحساب Google
        </button>
        <p className="mt-4 text-xs text-zinc-500">استعادة الحساب تتم من صفحة استرداد حساب Google</p>
      </div>
    </div>
  );
}
