import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN') // Need to check if available

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data: images, error } = await supabase
    .from('product_images')
    .select('id, url, products(internal_code)')
    .like('url', 'https://raw.githubusercontent.com/kustermarcio789/%')

  if (error) {
    console.error('Error fetching images:', error)
    return
  }

  console.log(`Found ${images?.length} images to migrate.`)

  for (const img of images || []) {
    try {
      const internalCode = img.products?.internal_code?.toLowerCase() || 'unknown'
      const urlParts = img.url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const ext = fileName.split('.').pop()
      
      // Determine index based on some logic or just use filename/id
      const storagePath = `wholesale/${internalCode}/${fileName}`

      console.log(`Processing ${img.url} -> ${storagePath}`)

      const response = await fetch(img.url, {
        headers: GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {}
      })

      if (!response.ok) {
        console.error(`Failed to fetch ${img.url}: ${response.statusText}`)
        continue
      }

      const blob = await response.blob()
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(storagePath, blob, {
          contentType: blob.type,
          upsert: true
        })

      if (uploadError) {
        console.error(`Upload error for ${storagePath}:`, uploadError)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath)

      const { error: updateError } = await supabase
        .from('product_images')
        .update({ url: publicUrl })
        .eq('id', img.id)

      if (updateError) {
        console.error(`Update error for image ID ${img.id}:`, updateError)
      } else {
        console.log(`Successfully migrated ${img.id} to ${publicUrl}`)
      }
    } catch (e) {
      console.error(`Error processing image ${img.id}:`, e)
    }
  }
}

run()
