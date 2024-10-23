import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { list } from '@vercel/blob'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const normalizeCategory = (category: string): string => {
  const lowercaseCategory = category.toLowerCase().trim();
  if (lowercaseCategory.includes('top') || lowercaseCategory.includes('shirt') || lowercaseCategory.includes('blouse') || lowercaseCategory.includes('t-shirt') || lowercaseCategory.includes('sweater') || lowercaseCategory.includes('sweatshirt')) return 'Tops';
  if (lowercaseCategory.includes('bottom') || lowercaseCategory.includes('pant') || lowercaseCategory.includes('trouser') || lowercaseCategory.includes('jeans') || lowercaseCategory.includes('skirt') || lowercaseCategory.includes('shorts')) return 'Bottoms';
  if (lowercaseCategory.includes('dress')) return 'Dresses';
  if (lowercaseCategory.includes('coat') || lowercaseCategory.includes('jacket') || lowercaseCategory.includes('cardigan') || lowercaseCategory.includes('blazer')) return 'Outerwear';
  if (lowercaseCategory.includes('shoe') || lowercaseCategory.includes('boot') || lowercaseCategory.includes('sneaker') || lowercaseCategory.includes('sandal') || lowercaseCategory.includes('footwear') || lowercaseCategory.includes('slipper')) return 'Footwear';
  if (lowercaseCategory.includes('accessory') || lowercaseCategory.includes('jewelry') || lowercaseCategory.includes('bag') || lowercaseCategory.includes('hat') || lowercaseCategory.includes('scarf') || lowercaseCategory.includes('belt')) return 'Accessories';
  if (lowercaseCategory.includes('suit')) return 'Suits';
  if (lowercaseCategory.includes('sport') || lowercaseCategory.includes('athletic')) return 'Sportswear';
  if (lowercaseCategory.includes('sleep') || lowercaseCategory.includes('pajama')) return 'Sleepwear';
  if (lowercaseCategory.includes('underwear') || lowercaseCategory.includes('lingerie')) return 'Underwear';
  return 'Other';
}

export async function POST() {
  console.log('POST /api/sync-databases: Started')
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    if (!kv) {
      throw new Error('KV store is not initialized')
    }

    const { blobs } = await list()
    console.log(`Found ${blobs.length} blobs`)

    const kvKeys = await kv.keys('wardrobe:*')
    console.log(`Found ${kvKeys.length} KV entries`)

    const blobIds = new Set(blobs.map(blob => blob.pathname.split('-')[0]))
    const kvIds = new Set(kvKeys.map(key => key.split(':')[1]))

    const missingInKV = [...blobIds].filter(id => !kvIds.has(id))
    console.log(`Found ${missingInKV.length} items missing in KV`)

    for (const blobId of missingInKV) {
      const blob = blobs.find(b => b.pathname.startsWith(blobId))
      if (!blob) continue

      console.log(`Processing blob: ${blob.pathname}`)

      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this clothing item and provide a detailed description including its category, occasion, fabric, pattern, color, sleeves, length. Format your response as a series of key-value pairs, one per line." },
              {
                type: "image_url",
                image_url: {
                  url: blob.url,
                  detail: "high"
                }
              },
            ],
          },
        ],
        max_tokens: 500,
      })

      const analysis = response.choices[0].message.content
      console.log('OpenAI analysis received:',   analysis)

      if (!analysis) {
        console.error('OpenAI analysis is empty for blob:', blob.pathname)
        continue
      }

      const parsedData = parseAnalysis(analysis)
      console.log('Parsed data:', parsedData)

      const item = {
        id: blobId,
        name: parsedData.name || blob.pathname,
        category: normalizeCategory(parsedData.category || 'Other'),
        blobId: blobId,
        occasion: parsedData.occasion || [],
        fabric: parsedData.fabric || '',
        pattern: parsedData.pattern || '',
        color: parsedData.color || [],
        sleeves: parsedData.sleeves || '',
        length: parsedData.length || '',
      }

      console.log('Saving item to KV store:', item)
      const kvResult = await kv.hset(`wardrobe:${item.id}`, item)
      console.log('KV store result:', kvResult)

      if (kvResult === 0) {
        console.error('Failed to save item to KV store:', item)
      }
    }

    console.log('Database sync completed')
    return NextResponse.json({ message: 'Database sync completed successfully' })
  } catch (error) {
    console.error('Error in POST /api/sync-databases:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}

function parseAnalysis(analysis: string) {
  const lines = analysis.split('\n')
  const parsedData: any = {
    name: '',
    category: '',
    occasion: [],
    fabric: '',
    pattern: '',
    color: [],
    sleeves: '',
    length: '',
  }

  lines.forEach(line => {
    const [key, ...valueParts] = line.split(':').map(s => s.trim())
    const value = valueParts.join(':').trim()
    if (key && value) {
      switch (key.toLowerCase()) {
        case 'name':
          parsedData.name = value
          break
        case 'category':
          parsedData.category = value
          break
        case 'occasion':
          parsedData.occasion = value.split(',').map((s: string) => s.trim())
          break
        case 'fabric':
          parsedData.fabric = value
          break
        case 'pattern':
          parsedData.pattern = value
          break
        case 'color':
          parsedData.color = value.split(',').map((s: string) => s.trim())
          break
        case 'sleeves':
          parsedData.sleeves = value
          break
        case 'length':
          parsedData.length = value
          break
      }
    }
  })

  return parsedData
}