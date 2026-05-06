// netlify/functions/transform.js
// Receives base64 image + mode, uploads to fal.ai storage, submits transform job

exports.handler = async (event) => {

// Handle CORS preflight
if (event.httpMethod === ‘OPTIONS’) {
return { statusCode: 200, headers: cors(), body: ‘’ }
}

if (event.httpMethod !== ‘POST’) {
return { statusCode: 405, body: ‘Method Not Allowed’ }
}

const FAL_KEY = process.env.FAL_API_KEY
if (!FAL_KEY) {
return {
statusCode: 500,
headers: cors(),
body: JSON.stringify({ error: ‘FAL_API_KEY environment variable is not set’ }),
}
}

try {
const { imageBase64, mimeType, mode } = JSON.parse(event.body)

```
if (!imageBase64) {
  return {
    statusCode: 400,
    headers: cors(),
    body: JSON.stringify({ error: 'No image data received' }),
  }
}

// ── STEP 1: Upload image to fal.ai storage ──────────────────────────────
const imgBuffer = Buffer.from(imageBase64, 'base64')

const uploadRes = await fetch('https://rest.fal.run/storage/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Key ${FAL_KEY}`,
    'Content-Type': mimeType || 'image/jpeg',
  },
  body: imgBuffer,
})

if (!uploadRes.ok) {
  const errText = await uploadRes.text()
  throw new Error(`Storage upload failed (${uploadRes.status}): ${errText}`)
}

const uploadData = await uploadRes.json()
const imageUrl = uploadData.url

if (!imageUrl) {
  throw new Error('fal.ai storage did not return a URL')
}

// ── STEP 2: Style prompts (retro 80s + modern) ──────────────────────────
const PROMPTS = {
  retro: [
    'GTA Vice City 16-bit pixel art portrait, retro arcade sprite style,',
    'neon pink and hot teal color palette, VHS grain overlay and CRT scanlines,',
    'chromatic aberration, Miami 1986 synthwave sunset sky,',
    '80s action movie poster aesthetic, neon glow effects,',
    'palm tree silhouettes, pastel neon gradient sky, cinematic composition,',
    'pixel art face detail, vibrant saturated colors, retro video game character',
  ].join(' '),

  modern: [
    'Vice City modern cinematic neon noir portrait, Miami night skyline backdrop,',
    'luxury crypto lifestyle aesthetic, hyperrealistic skin detail,',
    'deep dramatic shadows, volumetric neon pink and purple lighting,',
    'photorealistic 8K, high contrast color grade, Vice City atmosphere,',
    'sleek cinematic look, neon reflections, modern Miami crime thriller vibe,',
    'rich saturated teals and crimsons, ultra-detailed facial features',
  ].join(' '),
}

const prompt = PROMPTS[mode] || PROMPTS.retro

// ── STEP 3: Submit to fal.ai queue ──────────────────────────────────────
const queueRes = await fetch(
  'https://queue.fal.run/fal-ai/flux/dev/image-to-image',
  {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt,
      strength: 0.82,           // 0 = keep original, 1 = full transform. 0.82 = strong style, face preserved
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      image_size: 'square',
      enable_safety_checker: true,
    }),
  }
)

if (!queueRes.ok) {
  const errText = await queueRes.text()
  throw new Error(`Queue submit failed (${queueRes.status}): ${errText}`)
}

const queueData = await queueRes.json()

return {
  statusCode: 200,
  headers: { ...cors(), 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requestId: queueData.request_id,
    status: queueData.status,
  }),
}
```

} catch (err) {
console.error(’[transform error]’, err.message)
return {
statusCode: 500,
headers: cors(),
body: JSON.stringify({ error: err.message }),
}
}
}

function cors() {
return {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
‘Access-Control-Allow-Methods’: ‘POST, OPTIONS’,
}
}
