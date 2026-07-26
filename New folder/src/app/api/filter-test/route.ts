import { NextResponse } from "next/server";
import { isExplicitContent, isLowQualityContent } from "@/services/content-filter";

export async function POST(req: Request) {
  try {
    const mockContent = await req.json();
    
    // Structure expected by filter
    const testPayload = {
      title: mockContent.title || "",
      name: mockContent.name || "",
      overview: mockContent.overview || "",
      adult: mockContent.adult === true,
      vote_average: Number(mockContent.voteAverage || mockContent.vote_average || 0),
      vote_count: Number(mockContent.voteCount || mockContent.vote_count || 0),
      popularity: Number(mockContent.popularity || 0),
      runtime: Number(mockContent.runtime || 0),
      id: mockContent.id || 999999,
      
      // Keywords can be passed as an array of strings or array of objects
      keywords: {
        keywords: Array.isArray(mockContent.keywords) 
          ? mockContent.keywords.map((k: string) => ({ name: k })) 
          : []
      },
      
      // Release Dates (for Movies certification)
      release_dates: {
        results: [
          {
            iso_3166_1: mockContent.country || "US",
            release_dates: [
              {
                certification: mockContent.certification || "",
                descriptors: Array.isArray(mockContent.descriptors) ? mockContent.descriptors : []
              }
            ]
          }
        ]
      },
      
      // Content Ratings (for TV certification)
      content_ratings: {
        results: [
          {
            iso_3166_1: mockContent.country || "US",
            rating: mockContent.certification || ""
          }
        ]
      },
      
      // Production Companies
      production_companies: Array.isArray(mockContent.productionCompanies)
        ? mockContent.productionCompanies.map((name: string) => ({ name }))
        : [],
        
      // Cast
      credits: {
        cast: Array.isArray(mockContent.cast) 
          ? mockContent.cast.map((name: string) => ({ name })) 
          : [{ name: "Valid Actor" }] // default mock to avoid zero_cast penalty
      },
      genres: Array.isArray(mockContent.genres)
        ? mockContent.genres.map((g: string) => ({ name: g }))
        : [{ name: "Drama" }] // default mock to avoid no_genres penalty
    };

    const explicitResult = isExplicitContent(testPayload);
    const qualityResult = isLowQualityContent(testPayload);
    
    const shouldFilter = explicitResult.blocked || qualityResult.blocked;
    let reason = "unknown";
    if (explicitResult.blocked) reason = explicitResult.reason || "explicit_content";
    else if (qualityResult.blocked) reason = qualityResult.reason || "low_quality_content";

    return NextResponse.json({
      shouldFilter,
      reason,
      explicit: {
        blocked: explicitResult.blocked,
        reason: explicitResult.reason
      },
      quality: {
        blocked: qualityResult.blocked,
        reason: qualityResult.reason
      },
      payloadTested: {
        title: testPayload.title || testPayload.name,
        overview: testPayload.overview,
        keywords: getKeywordNames(testPayload),
        certifications: getCertifications(testPayload),
        companies: testPayload.production_companies.map((c: any) => c.name)
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Helpers duplicates for standalone safety inside API
function getKeywordNames(content: any): string[] {
  const raw = content?.keywords?.keywords || [];
  return raw.map((k: any) => (k?.name || '').toLowerCase().trim()).filter(Boolean);
}

function getCertifications(content: any): any[] {
  const out = [];
  for (const country of content?.release_dates?.results || []) {
    for (const rd of country.release_dates || []) {
      if (rd?.certification) {
        out.push({
          country: country.iso_3166_1,
          certification: rd.certification,
          descriptors: rd.descriptors || []
        });
      }
    }
  }
  return out;
}
