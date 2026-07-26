import { db } from "@/db";
import { sql } from "drizzle-orm";
import { movies, tvSeries, seasons, episodes } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Verify basic DB connectivity
    await db.execute(sql`select 1`);

    // 2. Fetch live counts from tables
    const moviesCountRes = await db.select({ count: sql<number>`count(*)` }).from(movies).where(eq(movies.isFiltered, 0));
    const tvCountRes = await db.select({ count: sql<number>`count(*)` }).from(tvSeries).where(eq(tvSeries.isFiltered, 0));
    const seasonsCountRes = await db.select({ count: sql<number>`count(*)` }).from(seasons);
    const episodesCountRes = await db.select({ count: sql<number>`count(*)` }).from(episodes);
    
    const filteredMoviesRes = await db.select({ count: sql<number>`count(*)` }).from(movies).where(eq(movies.isFiltered, 1));
    const filteredTVRes = await db.select({ count: sql<number>`count(*)` }).from(tvSeries).where(eq(tvSeries.isFiltered, 1));

    const moviesCount = Number(moviesCountRes[0]?.count || 0);
    const tvCount = Number(tvCountRes[0]?.count || 0);
    const seasonsCount = Number(seasonsCountRes[0]?.count || 0);
    const episodesCount = Number(episodesCountRes[0]?.count || 0);
    const filteredCount = Number(filteredMoviesRes[0]?.count || 0) + Number(filteredTVRes[0]?.count || 0);

    return Response.json({
      success: true,
      ok: true,
      database: {
        movies: moviesCount,
        tvSeries: tvCount,
        seasons: seasonsCount,
        episodes: episodesCount,
        filteredCount: filteredCount
      }
    });
  } catch (err: any) {
    console.error("Health check database query error:", err);
    return Response.json({ 
      success: false, 
      ok: false, 
      error: err.message 
    }, { status: 500 });
  }
}
