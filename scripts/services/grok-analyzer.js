/**
 * 🤖 Grok AI Content Analyzer
 * خدمة تحليل المحتوى بواسطة Grok
 */

const axios = require('axios');
const db = require('./local-db');

class GrokAnalyzer {
  constructor() {
    // دعم Mistral, XAI (Grok), Groq
    this.apiKey = process.env.MISTRAL_API_KEY || process.env.XAI_API_KEY || process.env.GROK_API_KEY || process.env.GROQ_API_KEY;
    
    // تحديد المزود بناءً على المفتاح المتاح
    if (process.env.MISTRAL_API_KEY) {
      this.apiUrl = 'https://api.mistral.ai/v1/chat/completions';
      this.model = 'mistral-small-latest';
      this.provider = 'mistral';
    } else if (process.env.XAI_API_KEY || process.env.GROK_API_KEY) {
      this.apiUrl = 'https://api.x.ai/v1/chat/completions';
      this.model = 'grok-beta';
      this.provider = 'grok';
    } else if (process.env.GROQ_API_KEY) {
      this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
      this.model = 'llama-3.3-70b-versatile';
      this.provider = 'groq';
    }
    
    this.version = '1.0';
    
    if (!this.apiKey) {
      throw new Error('MISTRAL_API_KEY, XAI_API_KEY, GROK_API_KEY, or GROQ_API_KEY not found in environment');
    }
    
    console.log(`🤖 استخدام ${this.provider.toUpperCase()} API (${this.model})`);
  }

  /**
   * تحليل محتوى واحد
   */
  async analyzeContent(contentId, contentType) {
    const startTime = Date.now();
    
    try {
      // 1. جلب بيانات المحتوى
      const content = this.getContentData(contentId, contentType);
      
      if (!content) {
        throw new Error(`Content not found: ${contentId} (${contentType})`);
      }
      
      // 2. التحقق من وجود تحليل سابق
      const existing = this.getExistingAnalysis(contentId, contentType);
      if (existing && existing.status === 'analyzed') {
        console.log(`⏭️  موجود: ${content.title}`);
        return existing;
      }
      
      // 3. بناء Prompt
      const prompt = this.buildPrompt(content);
      
      // 4. استدعاء Grok
      console.log(`🤖 تحليل: ${content.title} (${content.year})...`);
      const response = await this.callGrok(prompt);
      
      // 5. معالجة الرد
      const analysis = this.parseResponse(response, content);
      
      // 6. حفظ النتيجة
      const analysisId = this.saveAnalysis(contentId, contentType, analysis);
      
      // 7. تسجيل
      this.logAttempt(contentId, contentType, true, null, {
        request: prompt.substring(0, 500),
        response: response.substring(0, 500),
        processingTime: Date.now() - startTime
      });
      
      console.log(`✅ ${content.title}: ${analysis.ai_recommendation} (${analysis.confidence_score}%)`);
      
      return { ...analysis, id: analysisId };
      
    } catch (error) {
      console.error(`❌ خطأ: ${error.message}`);
      
      this.logAttempt(contentId, contentType, false, error.message, {
        processingTime: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * بناء Prompt للتحليل
   */
  buildPrompt(content) {
    return `Analyze this ${content.type} and provide a detailed JSON assessment.

**Content Information:**
- Title: ${content.title}
- Year: ${content.year || 'Unknown'}
- Genre: ${content.genre || 'Unknown'}
- TMDB Rating: ${content.tmdb_rating || 0}/10 (${content.tmdb_votes || 0} votes)
- TMDB Popularity: ${content.popularity || 0}
- Filter Reason: ${content.filter_reason}

**Your Task:**
1. Search for this content on IMDb, Rotten Tomatoes, and Google
2. Determine if it's popular, high quality, and worth watching
3. Decide if it should be unfiltered

**Required JSON Response:**
\`\`\`json
{
  "ai_rating": 7.5,
  "ai_recommendation": "unfilter",
  "confidence_score": 85,
  "is_popular": true,
  "popularity_score": 75,
  "is_high_quality": true,
  "quality_score": 80,
  "is_worth_watching": true,
  "worth_watching_score": 85,
  "imdb_rating": 7.8,
  "imdb_votes": 125000,
  "rotten_tomatoes_rating": 82,
  "metacritic_rating": 75,
  "genre_accuracy": "accurate",
  "target_audience": "mainstream",
  "content_quality": "good",
  "production_value": "high",
  "filter_reason_valid": false,
  "filter_reason_analysis": "Filtered due to missing poster, but content is popular and good",
  "should_be_filtered": false,
  "unfilter_priority": 1,
  "ai_summary": "Excellent film with high ratings and wide popularity, should be unfiltered immediately",
  "ai_pros": ["High IMDb rating", "Large vote count", "Positive critical reviews"],
  "ai_cons": ["Missing poster in TMDB"],
  "ai_notes": "Popular content filtered by mistake due to missing data",
  "search_results": {
    "found_on_imdb": true,
    "found_on_rt": true,
    "imdb_url": "https://www.imdb.com/title/tt1234567/"
  },
  "sources_checked": ["IMDb", "Rotten Tomatoes", "Google"]
}
\`\`\`

**Guidelines:**
- ai_recommendation: "unfilter" (IMDb >= 7.0 OR votes >= 10K), "keep_filtered" (poor/obscure), "needs_review" (uncertain)
- unfilter_priority: 1=urgent, 2=high, 3=medium, 4=low, 5=very low
- Search ACTUALLY - don't guess
- If no info found, say so clearly

Return ONLY the JSON, no extra text.`;
  }

  /**
   * استدعاء Grok API
   */
  async callGrok(prompt) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert content analyst. You search for content online and provide accurate assessments based on real data.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );
      
      return response.data.choices[0].message.content;
      
    } catch (error) {
      if (error.response) {
        throw new Error(`Grok API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * معالجة رد Grok
   */
  parseResponse(response, content) {
    try {
      // استخراج JSON
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/{[\s\S]*}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const data = JSON.parse(jsonStr);
      
      // التحقق من الحقول المطلوبة
      if (!data.ai_recommendation) {
        throw new Error('Missing ai_recommendation');
      }
      
      // تحويل القيم
      return {
        ai_rating: data.ai_rating || 0,
        ai_recommendation: data.ai_recommendation,
        confidence_score: data.confidence_score || 0,
        is_popular: data.is_popular ? 1 : 0,
        popularity_score: data.popularity_score || 0,
        is_high_quality: data.is_high_quality ? 1 : 0,
        quality_score: data.quality_score || 0,
        is_worth_watching: data.is_worth_watching ? 1 : 0,
        worth_watching_score: data.worth_watching_score || 0,
        imdb_rating: data.imdb_rating || null,
        imdb_votes: data.imdb_votes || null,
        rotten_tomatoes_rating: data.rotten_tomatoes_rating || null,
        metacritic_rating: data.metacritic_rating || null,
        genre_accuracy: data.genre_accuracy || null,
        target_audience: data.target_audience || null,
        content_quality: data.content_quality || null,
        production_value: data.production_value || null,
        filter_reason_valid: data.filter_reason_valid ? 1 : 0,
        filter_reason_analysis: data.filter_reason_analysis || null,
        should_be_filtered: data.should_be_filtered ? 1 : 0,
        unfilter_priority: data.unfilter_priority || 5,
        ai_summary: data.ai_summary || null,
        ai_pros: JSON.stringify(data.ai_pros || []),
        ai_cons: JSON.stringify(data.ai_cons || []),
        ai_notes: data.ai_notes || null,
        search_results: JSON.stringify(data.search_results || {}),
        sources_checked: JSON.stringify(data.sources_checked || [])
      };
      
    } catch (error) {
      console.error('Parse error:', error.message);
      
      // رد افتراضي
      return {
        ai_rating: 0,
        ai_recommendation: 'needs_review',
        confidence_score: 0,
        is_popular: 0,
        popularity_score: 0,
        is_high_quality: 0,
        quality_score: 0,
        is_worth_watching: 0,
        worth_watching_score: 0,
        ai_summary: `Parse error: ${error.message}`,
        ai_notes: response.substring(0, 1000),
        ai_pros: '[]',
        ai_cons: '[]',
        search_results: '{}',
        sources_checked: '[]'
      };
    }
  }

  /**
   * حفظ التحليل
   */
  saveAnalysis(contentId, contentType, analysis) {
    const result = db.prepare(`
      INSERT OR REPLACE INTO ai_content_analysis (
        content_id, content_type, ai_provider, analysis_version,
        ai_rating, ai_recommendation, confidence_score,
        is_popular, popularity_score, is_high_quality, quality_score,
        is_worth_watching, worth_watching_score,
        imdb_rating, imdb_votes, rotten_tomatoes_rating, metacritic_rating,
        genre_accuracy, target_audience, content_quality, production_value,
        filter_reason_valid, filter_reason_analysis, should_be_filtered, unfilter_priority,
        ai_summary, ai_pros, ai_cons, ai_notes,
        search_results, sources_checked,
        status, analyzed_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        'analyzed', CURRENT_TIMESTAMP
      )
    `).run(
      contentId, contentType, this.provider, this.version,
      analysis.ai_rating, analysis.ai_recommendation, analysis.confidence_score,
      analysis.is_popular, analysis.popularity_score,
      analysis.is_high_quality, analysis.quality_score,
      analysis.is_worth_watching, analysis.worth_watching_score,
      analysis.imdb_rating, analysis.imdb_votes,
      analysis.rotten_tomatoes_rating, analysis.metacritic_rating,
      analysis.genre_accuracy, analysis.target_audience,
      analysis.content_quality, analysis.production_value,
      analysis.filter_reason_valid, analysis.filter_reason_analysis,
      analysis.should_be_filtered, analysis.unfilter_priority,
      analysis.ai_summary, analysis.ai_pros, analysis.ai_cons, analysis.ai_notes,
      analysis.search_results, analysis.sources_checked
    );
    
    return result.lastInsertRowid;
  }

  /**
   * تسجيل المحاولة
   */
  logAttempt(contentId, contentType, success, errorMessage, data) {
    db.prepare(`
      INSERT INTO ai_analysis_log (
        content_id, content_type, success, error_message,
        request_data, response_data, processing_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      contentId, contentType, success ? 1 : 0, errorMessage,
      data.request || null,
      data.response || null,
      data.processingTime || 0
    );
  }

  /**
   * جلب بيانات المحتوى
   */
  getContentData(contentId, contentType) {
    if (contentType === 'movie') {
      return db.prepare(`
        SELECT 
          id, tmdb_id, title_en as title, release_year as year,
          primary_genre as genre, vote_average as tmdb_rating,
          vote_count as tmdb_votes, popularity, filter_reason,
          'movie' as type
        FROM movies WHERE id = ?
      `).get(contentId);
    } else {
      return db.prepare(`
        SELECT 
          id, tmdb_id, title_en as title, first_air_year as year,
          primary_genre as genre, vote_average as tmdb_rating,
          vote_count as tmdb_votes, popularity, filter_reason,
          'tv' as type
        FROM tv_series WHERE id = ?
      `).get(contentId);
    }
  }

  /**
   * التحقق من وجود تحليل سابق
   */
  getExistingAnalysis(contentId, contentType) {
    return db.prepare(`
      SELECT * FROM ai_content_analysis
      WHERE content_id = ? AND content_type = ?
    `).get(contentId, contentType);
  }
}

module.exports = new GrokAnalyzer();
