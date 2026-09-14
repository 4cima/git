'use client';

import { memo, useState } from 'react';
import { Loader2, Star, X } from 'lucide-react';
import { displayTitle } from './utils';
import type { MyReview } from './types';

interface Props {
  review: MyReview | null;
  onClose: () => void;
  onSaved: () => void;
}

export const EditReviewModal = memo(function EditReviewModal({ review, onClose, onSaved }: Props) {
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [text, setText] = useState(review?.review_text ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!review) return null;

  const title = displayTitle({ title_ar: review.title_ar, title: review.title, title_en: review.title_en });

  const save = async () => {
    if (!rating || rating < 1) {
      setError('اختر تقييماً من 1 إلى 10');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/user/reviews', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: review.content_type,
          tmdb_id: review.tmdb_id,
          rating,
          review_text: text.trim() || null,
          title: review.title || title,
        }),
      });
      if (!res.ok) throw new Error('save failed');
      onSaved();
      onClose();
    } catch {
      setError('تعذّر حفظ التقييم. حاول مجدداً.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={`تعديل تقييم ${title}`}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-lumen-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-black text-white">تعديل تقييم: <span className="text-lumen-gold">{title}</span></h2>
          <button onClick={onClose} aria-label="إغلاق" className="rounded-lg p-1.5 text-lumen-silver hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <p className="mb-2 text-xs font-black text-lumen-silver">تقييمك (1 - 10)</p>
        <div className="mb-4 flex flex-wrap items-center gap-1" role="radiogroup" aria-label="التقييم">
          {Array.from({ length: 10 }).map((_, i) => {
            const v = i + 1;
            return (
              <button
                key={v}
                role="radio"
                aria-checked={rating === v}
                aria-label={`${v} من 10`}
                onClick={() => setRating(v)}
                className="rounded-lg p-1 transition hover:scale-110"
              >
                <Star size={20} className={v <= rating ? 'text-lumen-gold' : 'text-white/20'} fill="currentColor" />
              </button>
            );
          })}
        </div>
        <label className="mb-2 block text-xs font-black text-lumen-silver" htmlFor="edit-review-text">
          مراجعتك (اختياري)
        </label>
        <textarea
          id="edit-review-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="ما رأيك في هذا العمل؟"
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-lumen-silver/50 focus:border-lumen-gold/60 focus:outline-none"
        />
        {error && <p className="mt-2 text-xs font-bold text-red-400">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-lumen-gold px-4 py-2.5 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            حفظ التقييم
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-lumen-silver transition hover:text-white"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
});
