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
    var retroPrompt = "In-game screenshot from Grand Theft Auto: Vice City (2002), early 2000s 3D video game engine. Low-poly character model with visible angular edges on the face, blocky jawline, and flat skin textures. Low-resolution texture mapping. The character is placed in a random Vice City location—could be a gritty alleyway, a neon-lit interior of a club, a sun-bleached pier, or a suburban street. The background features generic 2000s-era low-poly environment assets: blurry palm trees, simple boxy vehicles, and flat-shaded buildings. Strong atmospheric 1980s Miami vibe. Harsh, simple lighting with flat shadows. High contrast, saturated colors (pinks, teals, oranges). Visible aliasing (jagged edges), slight motion blur, and a grainy CRT monitor overlay. 4:3 aspect ratio. Authentic RenderWare engine aesthetic.";

    var modernPrompt = "A high-end cinematic lifestyle photograph of a person, set in a completely random and unpredictable location within the sprawling state of Leonida. The setting changes every time: it could be a chaotic, neon-lit strip club interior, a sun-reddened Everglades airboat dock, a high-traffic urban intersection with modern supercars, a quiet luxury poolside in Vice City, or a gritty suburban backyard with palm shadows. The lighting matches the specific time of day: from harsh midday sun with deep shadows to the hazy, golden-pink humidity of a Florida sunset. Hyper-detailed character rendering with realistic skin textures, pores, and sweat. The subject is dressed in contemporary coastal fashion, posed naturally for a candid photo. Next-gen visual fidelity, ray-traced reflections on skin and surfaces, volumetric atmosphere, and intense, saturated colors. Shallow depth of field with a beautiful bokeh background. 16:9 aspect ratio, shot on 35mm lens, filmic texture.";
    var prompt = mode === "modern" ? modernPrompt : retroPrompt;

    console.log("Submitting to fal.ai queue...");
    var queueRes = await fetch("https://queue.fal.run/fal-ai/flux-pro/kontext/max", {
      method: "POST",
      headers: { "Authorization": "Key " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageDataUrl, prompt: prompt, enhance_prompt: false })
    });
    var queueData = await queueRes.json();
    console.log("Queue response:", JSON.stringify(queueData));

    if (!queueData.request_id) {
      throw new Error("Queue submit failed: " + JSON.stringify(queueData));
    }

    var statusUrl = queueData.status_url;
    var responseUrl = queueData.response_url;
    console.log("Status URL:", statusUrl);

    // Poll every 2s — Kontext Max typically takes 6-12s, up to 8 attempts (16s max)
    for (var i = 0; i < 8; i++) {
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
