import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { put } from '@vercel/blob'
import { v4 as uuidv4 } from 'uuid'
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

export async function POST(request: Request) {
  console.log('POST /api/wardrobe: Started')
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set')
      throw new Error('OPENAI_API_KEY is not set')
    }
    if (!kv) {
      console.error('KV store is not initialized')
      throw new Error('KV store is not initialized')
    }

    const data = await request.formData()
    const files: File[] = data.getAll('images') as File[]

    console.log(`Number of files received: ${files.length}`)

    if (files.length === 0) {
      console.error('No images uploaded')
      return NextResponse.json({ error: 'No images uploaded' }, { status: 400 })
    }

    const uploadedItems = []
    const errors = []
    let successCount = 0

    for (const file of files) {
      console.log(`Processing file: ${file.name}`)
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const blobId = uuidv4()
        const filename = `${blobId}-${file.name}`

        console.log(`Uploading file to blob storage: ${filename}`)
        const { url } = await put(filename, buffer, { access: 'public' })
        console.log(`File uploaded successfully. URL: ${url}`)

        console.log('Sending image to OpenAI for analysis')
        const response = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this clothing item and provide a detailed description including its category, occasion, fabric, pattern, color, sleeves, length. Format your response as a JSON object with these fields." },
                {
                  type: "image_url",
                  image_url: {
                    url: url,
                    detail: "high"
                  }
                },
              ],
            },
          ],
          max_tokens: 500,
        })

        const analysis = response.choices[0].message.content
        console.log('OpenAI analysis received:', analysis)

        if (!analysis) {
          throw new Error('OpenAI analysis is empty')
        }

        let parsedData
        try {
          parsedData = JSON.parse(analysis)
        } catch (parseError) {
          console.error('Error parsing OpenAI response:', parseError)
          throw new Error('Failed to parse OpenAI response')
        }
        console.log('Parsed data:', parsedData)

        const item = {
          id: uuidv4(),
          name: parsedData.name || file.name,
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
          throw new Error('Failed to save item to KV store')
        }
        
        uploadedItems.push(item)
        successCount++
        console.log('Item saved successfully')
      } catch (error) {
        console.error('Error processing file:', file.name, error)
        errors.push({ fileName: file.name, message: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    if (uploadedItems.length === 0) {
      console.error('Failed to process any uploaded images')
      return NextResponse.json({ error: 'Failed to process any uploaded images', errors }, { status: 500 })
    }

    console.log(`Successfully processed ${uploadedItems.length} images`)
    return NextResponse.json({ 
      message: `Successfully processed ${successCount} out of ${files.length} images`,
      items: uploadedItems,
      errors: errors.length > 0 ? errors : undefined,
      successCount
    })
  } catch (error) {
    console.error('Error in POST /api/wardrobe:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}

export async function GET() {
  console.log('GET /api/wardrobe: Started')
  try {
    if (!kv) {
      console.error('KV store is not initialized')
      throw new Error('KV store is not initialized')
    }

    const keys = await kv.keys('wardrobe:*')
    const items = await Promise.all(keys.map(key => kv.hgetall(key)))

    console.log(`Retrieved ${items.length} items from the wardrobe`)
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error in GET /api/wardrobe:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  console.log('DELETE /api/wardrobe: Started')
  try {
    if (!kv) {
      console.error('KV store is not initialized')
      throw new Error('KV store is not initialized')
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      console.error('No item ID provided for deletion')
      return NextResponse.json({ error: 'No item ID provided' }, { status: 400 })
    }

    const key = `wardrobe:${id}`
    const deleted = await kv.del(key)

    if (deleted === 0) {
      console.error(`Item with ID ${id} not found`)
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    console.log(`Successfully deleted item with ID ${id}`)
    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/wardrobe:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}