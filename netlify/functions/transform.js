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

    console.log("Submitting to fal.ai queue...");
    var queueRes = await fetch("https://queue.fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: { "Authorization": "Key " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageDataUrl, prompt: prompt, strength: 0.85, num_inference_steps: 28, guidance_scale: 3.5, num_images: 1, image_size: "square" })
    });
    var queueData = await queueRes.json();
    console.log("Queue response:", JSON.stringify(queueData));

    if (!queueData.request_id) {
      throw new Error("Queue submit failed: " + JSON.stringify(queueData));
    }

    var statusUrl = queueData.status_url;
    var responseUrl = queueData.response_url;
    console.log("Status URL:", statusUrl);

    // Poll every 2s — fal.ai finishes in ~1.5s so should complete on first check
    for (var i = 0; i < 4; i++) {
      await new Promise(function(r) { setTimeout(r, 2000); });
      console.log("Polling attempt", i + 1, statusUrl);

      var statusRes = await fetch(statusUrl, {
        headers: { "Authorization": "Key " + key }
      });
      var statusData = await statusRes.json();
      console.log("Status:", statusData.status);

      if (statusData.status === "COMPLETED") {
        console.log("Fetching result from:", responseUrl);
        var resultRes = await fetch(responseUrl, {
          headers: { "Authorization": "Key " + key }
        });
        var result = await resultRes.json();
        console.log("Result keys:", Object.keys(result));

        var imageUrl = result.images && result.images[0] ? result.images[0].url : null;
        console.log("Image URL:", imageUrl);

        if (!imageUrl) {
          throw new Error("No image URL. Result was: " + JSON.stringify(result));
        }

        return {
          statusCode: 200,
          headers: corsHeaders(),
          body: JSON.stringify({ imageUrl: imageUrl })
        };
      }
    }

    throw new Error("Timed out waiting for fal.ai");

  } catch (err) {
    console.error("ERROR:", err.message);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
  }
};

function corsHeaders() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
}
