exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headers(), body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  var key = process.env.FAL_API_KEY
  if (!key) {
    return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: 'No API key' }) }
  }
  try {
    var data = JSON.parse(event.body)
    var buf = Buffer.from(data.imageBase64, 'base64')
    var up = await fetch('https://rest.fal.run/storage/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + key, 'Content-Type': 'image/jpeg' },
      body: buf
    })
    var upData = await up.json()
    if (!upData.url) throw new Error('Upload failed')
    var prompt = data.mode === 'modern'
      ? 'Vice City modern cinematic neon noir portrait Miami night neon pink purple lighting hyperrealistic 8K'
      : 'GTA Vice City 16-bit pixel art portrait neon pink teal VHS grain Miami 1986 synthwave arcade style'
    var q = await fetch('https://queue.fal.run/fal-ai/flux/dev/image-to-image', {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: upData.url, prompt: prompt, strength: 0.82, num_inference_steps: 28, guidance_scale: 3.5, num_images: 1, image_size: 'square' })
    })
    var qData = await q.json()
    return { statusCode: 200, headers: headers(), body: JSON.stringify({ requestId: qData.request_id, status: qData.status }) }
  } catch (err) {
    return { statusCode: 500, headers: headers(), body: JSON.stringify({ error: err.message }) }
  }
}
function headers() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' }
}
