// Groq AI utilities for Next.js

export async function generateAiInsights(title: string, type: string, overview: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
    const response = await fetch(`${apiUrl}/api/groq-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, overview }),
    })
    
    if (!response.ok) {
      throw new Error('Failed to generate insights')
    }
    
    const data = await response.json()
    return data.summary || overview
  } catch (error) {
    console.error('AI insights error:', error)
    return overview
  }
}

export async function translateTitleToArabic(title: string) {
  // Placeholder for translation
  return title
}

export async function generateAiPlaylist(genres: string[], history: string[]) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
    const response = await fetch(`${apiUrl}/api/groq-recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ genres, history }),
    })
    
    if (!response.ok) {
      throw new Error('Failed to generate playlist')
    }
    
    const data = await response.json()
    return data.titles || []
  } catch (error) {
    console.error('AI playlist error:', error)
    return []
  }
}
