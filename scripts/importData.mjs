import { createClient } from '@sanity/client'
import axios from 'axios'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
// Create Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2025-02-18'
})
async function uploadImageToSanity(imageUrl) {
  try {
    console.log(`Uploading image: ${imageUrl}`)
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(response.data)
    const asset = await client.assets.upload('image', buffer, {
      filename: imageUrl.split('/').pop()
    })
    console.log(`Image uploaded successfully: ${asset._id}`)
    return asset._id
  } catch (error) {
    console.error('Failed to upload image:', imageUrl, error)
    return null
  }
}
async function importData() {
  try {
    console.log('Fetching products from API...')
    const response = await axios.get(process.env.NEXT_PUBLIC_API_URL)
    const products = response.data
    console.log(`Fetched ${products.length} products`)
    for (const product of products) {
      console.log(`Processing product: ${product.name}`)
      let imageRef = null
      if (product.imageUrl) {
        imageRef = await uploadImageToSanity(product.imageUrl)
      }
      const sanityProduct = {
        _type: 'products',
        name: product.name,
        description: product.description,
        price: product.price,
        image: imageRef? {
          _type: 'image',
          asset: {
            _ref: imageRef,
          },
        }:undefined,
        category: product.category,
        discountPercent: product.discountPercent,
        isNew: product.isNew,
        colors: product.colors,
        sizes: product.sizes
      }
      console.log('Uploading product to Sanity:', sanityProduct.name)
      const result = await client.create(sanityProduct)
      console.log(`Product uploaded successfully: ${result._id}`)
    }
    console.log('Data imported successfully!')
  } catch (error) {
    console.error('Error importing data:', error)
  }
}
importData()