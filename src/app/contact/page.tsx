'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: fd.get('subject'),
        message: fd.get('message')
      })
    });
    if (res.ok) setSent(true);
    setLoading(false);
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
