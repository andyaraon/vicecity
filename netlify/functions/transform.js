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

    // ── RETRO PROMPTS — 3 variations, randomly selected ─────────────────────
    var retroPrompts = [
      // V1 — In-Game Character Model
      "Transform this person into a playable character model from Grand Theft Auto: Vice City (2002) on PlayStation 2. Their face and likeness must be recognisable but rendered as a RenderWare engine 3D character — slightly plastic skin texture, simplified facial geometry, flat low-resolution texture mapping, subtle polygonal edges. They are standing in a random Vice City location: a gritty back alley, a neon-soaked nightclub entrance, a sun-bleached ocean boulevard, or a quiet suburban street at dusk. Environment is fully low-poly: flat-shaded buildings, simple boxy parked cars, blurry palm trees. 1980s Miami colour palette — hot pink, electric teal, burnt orange sky. Harsh flat directional lighting, minimal shadows. No HUD. No health bar. No game UI elements whatsoever. Pure in-game character render. 4:3 composition.",
      // V2 — Vice City Box Art / Poster Style
      "Recreate this person in the exact illustrated poster art style of Grand Theft Auto: Vice City original box art and promotional material. Their face should be recognisable but painted in the iconic Rockstar graphic novel style — bold ink outlines, slightly exaggerated features, flat cel-shaded colours with strong contrast. Full body shot, posed confidently like a Vice City character reveal. Background is a stylised 1980s Miami skyline at sunset: deep purple sky, silhouetted palm trees, neon reflections on wet pavement. Rich colour blocking — magenta, violet, gold, electric blue. Looks like a limited edition poster. No HUD. No game UI. No health bars. Pure Rockstar promotional art aesthetic.",
      // V3 — Loading Screen Splash Art
      "Render this person in the style of Grand Theft Auto: Vice City character loading screen artwork — the iconic illustrated splash screens shown during gameplay loading. Their likeness is preserved but stylised into a semi-painted digital illustration: slightly detailed face with bold shadows, graphic ink outlines, flat mid-tones with no photorealism. Full figure, side-angled pose, wearing era-appropriate 1980s Miami fashion. Background is a simple graphic Vice City scene — a neon-lit strip, a marina at night, or a highway overpass. Colours are saturated and punchy: coral pink, seafoam teal, golden yellow. Feels like a Rockstar character card. No HUD. No health bar. No UI overlays of any kind."
    ];

    // ── MODERN PROMPTS — 3 variations, randomly selected ────────────────────
    var modernPrompts = [
      // V1 — GTA 6 Trailer Screenshot
      "Recreate this person as they would appear in a Grand Theft Auto VI official trailer screenshot — the exact Rockstar visual language from the 2023 reveal trailer. Their face is fully preserved with hyper-detailed skin, pores, and natural expression, but the overall image feels like a next-gen game engine render, not a photograph. They are captured mid-scene in a random Leonida location: a fluorescent-lit gas station at night, a chaotic Miami-style boulevard with supercars, a humid Everglades dock at golden hour, or a luxury rooftop pool in Vice City. Cinematic 2.39:1 widescreen composition. Volumetric haze, intense Florida humidity in the air. Ray-traced lighting. Saturated but realistic colour grade — warm shadows, teal highlights. No HUD. No health bar. No game UI. Pure trailer frame.",
      // V2 — Rockstar Official Character Render
      "Transform this person into an official Rockstar Games character promotional render for Grand Theft Auto VI. Their exact likeness is preserved but elevated — skin has next-gen texture detail, eyes are sharp and cinematic, clothing has realistic fabric simulation. Full body, clean three-quarter pose against a Leonida environment backdrop: a sun-drenched Vice City beach strip, a neon motel parking lot at dusk, a gritty Overtown street corner, or a glass-and-steel penthouse terrace. Lighting is dramatic and intentional — think Rockstar official character artwork for Jason and Lucia. Background is slightly depth-of-field blurred but fully rendered. Colour grade is rich and filmic: warm golden tones, deep teal shadows. No HUD. No health bar. No UI elements. Clean promotional render.",
      // V3 — In-Game Cutscene
      "Place this person inside a Grand Theft Auto VI in-engine cutscene. Their face is rendered with full next-gen fidelity — realistic skin subsurface scattering, detailed eyes, natural micro-expressions — matching their exact real-world likeness. The scene is a cinematic close-to-mid shot in a random Leonida setting: a dimly lit strip club back room, a humid Florida highway at magic hour, a luxury yacht deck at night, or a tense back-alley in Vice City. Dramatic cinematic lighting — practical neon signs casting coloured light, headlights, or harsh Florida sun cutting through venetian blinds. Shot on virtual 35mm with shallow depth of field. Background characters and environment are fully rendered at GTA 6 quality. Rockstar signature colour grade — punchy contrast, warm skin tones, teal-to-orange palette. No HUD. No health bar. No UI of any kind. Pure cutscene frame."
    ];

    // Pick a random prompt from the matching mode array
    var retroIdx  = Math.floor(Math.random() * retroPrompts.length);
    var modernIdx = Math.floor(Math.random() * modernPrompts.length);
    var prompt = mode === "modern"
      ? modernPrompts[modernIdx]
      : retroPrompts[retroIdx];

    console.log("Mode:", mode, "| Prompt variant:", mode === "modern" ? modernIdx + 1 : retroIdx + 1);

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
