import { db } from "@/db";
import { movies, tvSeries } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Generates a clean URL slug from any English text
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

/**
 * Generates a unique, SEO-friendly slug for a movie or TV series.
 * Automatically checks the database for conflicts and appends increments if needed.
 */
export async function generateUniqueSlug(
  titleEn: string,
  year: number | null,
  tableName: "movies" | "tv_series"
): Promise<string> {
  const baseSlug = slugify(titleEn || "untitled");
  let proposedSlug = year ? `${baseSlug}-${year}` : baseSlug;
  
  if (!proposedSlug) {
    proposedSlug = "content";
  }

  let isUnique = false;
  let suffix = 0;
  let finalSlug = proposedSlug;

  while (!isUnique) {
    // Check if slug exists in the database
    let exists = false;
    if (tableName === "movies") {
      const result = await db
        .select({ tmdbId: movies.tmdbId })
        .from(movies)
        .where(eq(movies.slug, finalSlug))
        .limit(1);
      exists = result.length > 0;
    } else {
      const result = await db
        .select({ tmdbId: tvSeries.tmdbId })
        .from(tvSeries)
        .where(eq(tvSeries.slug, finalSlug))
        .limit(1);
      exists = result.length > 0;
    }

    if (!exists) {
      isUnique = true;
    } else {
      suffix++;
      finalSlug = `${proposedSlug}-${suffix}`;
    }
  }

  return finalSlug;
}
