exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  var key = process.env.FAL_API_KEY;
  if (!key) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: "FAL_API_KEY not set" }) };
  }
  try {
    var parsed = JSON.parse(event.body);
    var imageBase64 = parsed.imageBase64;
    var mode = parsed.mode || "retro";
    if (!imageBase64) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: "No image received" }) };
    }

    var imageDataUrl = "data:image/jpeg;base64," + imageBase64;
    var retroPrompt = "GTA Vice City pixel art 16-bit retro portrait, neon pink and teal, VHS grain, CRT scanlines, Miami 1986 synthwave, arcade game sprite style";
    var modernPrompt = "Vice City cinematic portrait, neon noir Miami night, luxury aesthetic, dramatic lighting, hyperrealistic, neon pink and purple glow";
    var prompt = mode === "modern" ? modernPrompt : retroPrompt;

    // Use synchronous fal.run endpoint — returns result directly, no queue needed
    var res = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: { "Authorization": "Key " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageDataUrl,
        prompt: prompt,
        strength: 0.85,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        image_size: "square"
      })
    });

    var result = await res.json();
    var imageUrl = result.images && result.images[0] ? result.images[0].url : null;

    if (!imageUrl) {
      throw new Error("No image URL in response: " + JSON.stringify(result));
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ imageUrl: imageUrl })
    };

  } catch (err) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
  }
};

function corsHeaders() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
}
