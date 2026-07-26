import { NextResponse } from "next/server";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get("contentTmdbId");
    const type = searchParams.get("contentType");

    if (!tmdbId || !type) {
      return NextResponse.json({ success: false, error: "مطلوب معرف المحتوى ونوعه" }, { status: 400 });
    }

    const id = parseInt(tmdbId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "المعرف غير صالح" }, { status: 400 });
    }

    const data = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.contentTmdbId, id), eq(reviews.contentType, type)))
      .orderBy(desc(reviews.createdAt));

    return NextResponse.json({ success: true, reviews: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contentTmdbId, contentType, authorName, rating, content } = body;

    if (!contentTmdbId || !contentType || !authorName || !content) {
      return NextResponse.json({ success: false, error: "جميع الحقول (الاسم، المحتوى، والتعليق) مطلوبة" }, { status: 400 });
    }

    const id = parseInt(contentTmdbId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "المعرف غير صالح" }, { status: 400 });
    }

    await db.insert(reviews).values({
      contentTmdbId: id,
      contentType,
      authorName: authorName.substring(0, 100),
      rating: Math.max(1, Math.min(5, Number(rating || 5))),
      content: content,
      createdAt: new Date()
    });

    return NextResponse.json({ success: true, message: "تمت إضافة تعليقك بنجاح!" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
