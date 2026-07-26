const axios = require('axios')

// قائمة User-Agents للـ rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
  'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15'
]

let userAgentIndex = 0

function getNextUserAgent() {
  const ua = USER_AGENTS[userAgentIndex]
  userAgentIndex = (userAgentIndex + 1) % USER_AGENTS.length
  return ua
}

// Groq API للترجمة كـ fallback
async function translateWithGroq(text, targetLang = 'ar') {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the given text to ${targetLang === 'ar' ? 'Arabic' : targetLang === 'en' ? 'English' : targetLang}. Return ONLY the translation, nothing else.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )
    
    return response.data.choices[0]?.message?.content?.trim() || null
  } catch (error) {
    return null
  }
}

async function translateText(text, targetLang = 'ar', sourceLang = 'auto') {
  if (!text || text.trim().length < 3) return null
  
  // المحاولة الأولى: Google Translate مع User-Agent rotation
  try {
    const url = 'https://translate.googleapis.com/translate_a/single'
    const response = await axios.get(url, {
      params: { client: 'gtx', sl: sourceLang, tl: targetLang, dt: 't', q: text.substring(0, 4500) },
      timeout: 15000,
      headers: { 'User-Agent': getNextUserAgent() }
    })
    
    if (response.data && response.data[0]) {
      const translated = response.data[0].filter(item => item && item[0]).map(item => item[0]).join('')
      if (translated && translated.trim().length > 0) {
        return translated
      }
    }
  } catch (error) {
    // صامت - Google Translate غير موثوق
  }
  
  // المحاولة الثانية: Groq API
  const groqResult = await translateWithGroq(text, targetLang)
  if (groqResult && groqResult.trim().length > 0) {
    return groqResult
  }
  
  // المحاولة الثالثة: Mistral fallback
  if (process.env.MISTRAL_API_KEY) {
    try {
      const response = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
          model: 'mistral-small-latest',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the given text to ${targetLang === 'ar' ? 'Arabic' : targetLang === 'en' ? 'English' : targetLang}. Return ONLY the translation, nothing else.`
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )
      
      return response.data.choices[0]?.message?.content?.trim() || null
    } catch (error) {
      // صامت - Mistral فشل
    }
  }
  
  // إذا فشل كل شيء
  return null
}

async function translateContent(data) {
  const title = data.title_en || data.title || data.name_en || data.name
  const overview = data.overview_en || data.overview
  
  const result = { title_ar: null, overview_ar: null, title_en: null }
  
  // ترجمة للعربي
  if (title) result.title_ar = await translateText(title, 'ar')
  if (overview) {
    await new Promise(r => setTimeout(r, 500))
    result.overview_ar = await translateText(overview, 'ar')
  }
  
  // ترجمة للإنجليزي (إذا كان العنوان الأصلي بلغة أخرى)
  if (title && !isEnglish(title)) {
    result.title_en = await translateText(title, 'en')
  }
  
  return result
}

// فحص إذا كان النص إنجليزي
function isEnglish(text) {
  if (!text) return false
  // فحص إذا كان معظم النص أحرف لاتينية
  const latinChars = text.match(/[a-zA-Z]/g) || []
  const totalChars = text.replace(/\s/g, '').length
  return latinChars.length / totalChars > 0.7
}

module.exports = { translateText, translateContent, isEnglish }
