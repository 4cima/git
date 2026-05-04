/**
 * Translation Service - Google Translate (Unofficial API)
 * مجاني، بدون حد يومي، وبيشتغل كويس
 */

import axios from 'axios'

/**
 * Translate text using Google Translate (unofficial)
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language (ar, en)
 * @param {string} sourceLang - Source language (auto = detect automatically)
 * @returns {Promise<string|null>} Translated text or null
 */
async function translateText(text, targetLang = 'ar', sourceLang = 'auto') {
  if (!text || text.trim().length < 3) return null

  // تقسيم النص لو طويل (Google بيقبل حتى 5000 حرف)
  const chunks = splitText(text, 4500)
  const translated = []

  for (const chunk of chunks) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single`
      const response = await axios.get(url, {
        params: {
          client: 'gtx',
          sl: sourceLang,
          tl: targetLang,
          dt: 't',
          q: chunk
        },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      })

      if (response.data && response.data[0]) {
        const result = response.data[0]
          .filter(item => item && item[0])
          .map(item => item[0])
          .join('')
        translated.push(result)
      }

      // delay بسيط بين الـ chunks
      if (chunks.length > 1) await sleep(300)

    } catch (error) {
      console.log(`   ⚠️  Translation chunk failed: ${error.message}`)
      return null
    }
  }

  return translated.join('') || null
}

/**
 * Split text into chunks for translation
 * @param {string} text - Text to split
 * @param {number} maxLength - Maximum length per chunk
 * @returns {string[]} Array of text chunks
 */
function splitText(text, maxLength) {
  if (text.length <= maxLength) return [text]

  const chunks = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength) {
      if (current) chunks.push(current.trim())
      current = sentence
    } else {
      current += (current ? ' ' : '') + sentence
    }
  }
  if (current) chunks.push(current.trim())
  return chunks
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Translate movie/series data (title + overview)
 * @param {Object} data - { title_en, overview_en } or { title, overview }
 * @returns {Promise<Object>} { title_ar, overview_ar }
 */
export async function translateContent(data) {
  const result = {
    title_ar: null,
    overview_ar: null
  }

  const title = data.title_en || data.title || data.name_en || data.name
  const overview = data.overview_en || data.overview

  // Translate title
  if (title) {
    console.log(`   🌐 ترجمة العنوان: "${title.substring(0, 50)}..."`)
    result.title_ar = await translateText(title, 'ar')
    if (result.title_ar) {
      console.log(`   ✅ عنوان: "${result.title_ar}"`)
    } else {
      console.log(`   ❌ فشل ترجمة العنوان`)
    }
  }

  // Translate overview (with delay to avoid rate limiting)
  if (overview) {
    await sleep(500)
    console.log(`   🌐 ترجمة الوصف (${overview.length} حرف)...`)
    result.overview_ar = await translateText(overview, 'ar')
    if (result.overview_ar) {
      console.log(`   ✅ وصف: ${result.overview_ar.length} حرف`)
    } else {
      console.log(`   ❌ فشل ترجمة الوصف`)
    }
  }

  return result
}

/**
 * Check if text contains Arabic characters
 */
export function hasArabicText(text) {
  if (!text) return false
  return /[\u0600-\u06FF]/.test(text)
}
