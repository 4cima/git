'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: fd.get('subject'),
          message: fd.get('message')
        })
      });
      if (res.ok) setSent(true);
      else setError('تعذّر إرسال الرسالة، حاول مرة أخرى.');
    } catch {
      setError('تعذّر الوصول للخادم، تأكد من الاتصال وحاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-24 px-6 text-right" dir="rtl">
      <h1 className="text-4xl font-bold mb-8 text-white tracking-tight">
        الاقتراحات والشكاوى
      </h1>
      {sent ? (
        <div className="bg-green-600/20 p-8 rounded-3xl border border-green-500 text-green-400 font-bold text-center">
          تم الاستلام بنجاح، شكراً لك!
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div role="alert" className="bg-red-600/20 p-4 rounded-2xl border border-red-500/60 text-red-300 font-bold text-center text-sm">
              {error}
            </div>
          )}
          <input
            name="subject"
            placeholder="عنوان الموضوع"
            className="w-full bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl text-white outline-none focus:border-white transition-all"
            required
          />
          <textarea
            name="message"
            placeholder="اكتب اقتراحك أو شكواك بالتفصيل هنا..."
            rows={6}
            className="w-full bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl text-white outline-none focus:border-white transition-all"
            required
          />
          <button
            disabled={loading}
            className="w-full bg-white text-black font-black h-16 rounded-2xl hover:bg-zinc-200 transition-all shadow-xl disabled:opacity-50"
          >
            {loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
          </button>
        </form>
      )}
    </div>
  );
}
