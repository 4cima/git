import { NextResponse } from "next/server";
import { ingestMovie, ingestSeries } from "@/services/ingestion";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tmdbId, type, apiKey, groqKey } = body;

    if (!tmdbId || !type) {
      return NextResponse.json({ success: false, error: "مطلوب إدخال TMDB ID ونوع المحتوى (movie أو tv)" }, { status: 400 });
    }

    const id = parseInt(tmdbId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "مُعرّف TMDB ID يجب أن يكون رقماً صالحاً" }, { status: 400 });
    }

    // Temporary override keys for the request context if provided
    if (apiKey) process.env.TMDB_API_KEY = apiKey;
    if (groqKey) process.env.GROQ_API_KEY = groqKey;

    let result;
    if (type === "movie") {
      result = await ingestMovie(id);
    } else if (type === "tv") {
      result = await ingestSeries(id);
    } else {
      return NextResponse.json({ success: false, error: "نوع محتوى غير معروف. يجب أن يكون movie أو tv" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
