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
      // V1 — PS2 In-Game Render
      "Transform the entire image into a Grand Theft Auto: Vice City in-game screenshot rendered on PlayStation 2. Rebuild everything — the person, clothing, and environment — in the RenderWare engine aesthetic. The person's face stays recognisable but the skin must look exactly like a GTA Vice City 2002 PS2 character model: one single flat muted brown-tan skin tone filling the entire face — the exact neutral skin colour of GTA Vice City 2002 PS2 character models, NOT orange, NOT red, NOT warm — a flat neutral medium-brown. Zero colour variation across the face, zero gradients, zero blending. Only 2 flat hard-edged shadow zones in a slightly darker brown — like a PS2 polygon mesh painted with one coat of flat brown paint. Blocky jawline, angular cheeks, hard polygon edges on the face. Skin looks completely flat and uniform like a painted 3D model. Place them in a random action scene — walking down a neon-lit Vice City street, leaning on a boxy 80s car, standing outside a club entrance, or on a sun-bleached dock. The entire scene must look uniformly like PS2 graphics — flat-shaded buildings, low-res blurry palm trees, simple boxy cars, no photorealism anywhere. 1980s Miami palette: hot pink, electric teal, burnt orange. Harsh flat directional lighting. 4:3 composition. No HUD. No health bar. No game UI of any kind.",
      // V2 — Stephen Bliss Box Art
      "Redraw the entire image as a Grand Theft Auto: Vice City promotional illustration in the exact style of artist Stephen Bliss — the original painter of all Vice City box art and loading screens. Convert the person's face and body into his iconic 2D illustrated style: thick bold black ink outlines around everything, flat cel-shaded colour fills with hard shadow edges, no photorealism, slightly exaggerated confident pose. The skin must be rendered in the flat 2D illustrated style using the exact neutral brown-tan skin tone of GTA Vice City 2002 character models — NOT orange, NOT red, a flat muted medium-brown. One single solid skin colour with only 2 hard-edged darker shadow blocks, no colour variation, no gradients, no texture, no pores. Skin looks like the 2002 game character painted flat in Stephen Bliss illustration style — one tone, bold, completely uniform. The entire image must look like a flat 2D Rockstar poster — no depth of field, no photography, pure graphic illustration. Background is a stylised 1980s Miami sunset: deep violet and magenta sky, silhouetted palm trees, neon signs. Full body portrait, confident character reveal pose. Colours are bold and blocked: hot pink, electric blue, gold, violet. No HUD. No health bar. No UI of any kind.",
      // V3 — Loading Screen Character Card
      "Redraw this entire image as a Grand Theft Auto: Vice City character loading screen illustration — the iconic splash art shown between missions. Transform everything into Stephen Bliss-inspired semi-painted 2D artwork: the person's face is recognisable but fully illustrated with bold ink outlines, flat colour blocking, hard cel-shaded shadows, and zero photorealism. The skin must use the exact flat neutral brown-tan skin tone of GTA Vice City 2002 character models — NOT orange, NOT red, a flat muted medium-brown, one uniform colour. One solid colour fills the entire face with only two hard-edged slightly darker shadow zones — zero gradients, zero colour variation, zero texture, zero pores. Skin looks like the 2002 PS2 polygon mesh painted flat in a graphic illustrated style — completely uniform, one coat, no warmth, no redness. Dynamic pose — mid-stride on a Vice City boulevard, holding a phone near a luxury car, or standing on a rooftop with the city behind them. Wearing era-appropriate 1980s Miami fashion: linen suit, Hawaiian shirt, or leather jacket. Background is a graphic Vice City scene — marina at dusk, neon-lit strip, or ocean boulevard at sunset. Saturated punchy colours: coral pink, seafoam teal, golden yellow. Illustrated poster-style composition, no depth-of-field photography. No HUD. No health bar. No UI overlays of any kind."
    ];

    // ── MODERN PROMPTS — 3 variations, randomly selected ────────────────────
    var modernPrompts = [
      // V1 — GTA 6 Trailer Frame
      "Transform the entire image to match the exact visual style of the official Grand Theft Auto VI trailer. Rebuild the person as a GTA 6 game-engine-rendered character — their face stays recognisable but is rendered in Rockstar's next-gen engine style: hyper-detailed skin, realistic eyes, slight CG quality that separates it from a real photograph. NOT a photo edit — the whole image must look like a game engine output. Dynamic action scene in Leonida: riding a motorcycle through a neon-lit Vice City boulevard, running from police across a sun-drenched strip mall car park, standing on the hood of a muscle car at golden hour Everglades, or walking away from a burning vehicle at night. Cinematic widescreen composition. Volumetric Florida haze in the air. Ray-traced lighting. Warm shadows, teal highlights. No HUD. No health bar. No game UI. No text overlays.",
      // V2 — Rockstar Official Key Art
      "Convert the entire image into official Rockstar Games GTA VI promotional key art — the same quality and style as the official Jason and Lucia character posters. Rebuild the person as a fully game-rendered character: their face preserved and recognisable but rendered in Rockstar's signature style — slightly stylised, cinematic, not purely photographic. Full body three-quarter pose in a Leonida setting: sun-drenched Vice City beach strip at sunset, luxury penthouse rooftop with city behind them, neon motel parking lot at night, or Everglades airboat dock at golden hour. Dramatic intentional lighting — warm rim light on one side, deep teal fill on the other. Background is depth-of-field blurred but fully rendered in GTA 6 quality. Rich filmic colour grade: warm skin tones, teal shadows, high saturation. No HUD. No health bar. No UI of any kind. Clean promotional render.",
      // V3 — In-Engine Cutscene
      "Rebuild this entire image as a Grand Theft Auto VI in-engine cutscene still frame. The person's face must be recognisable but fully rendered in Rockstar's next-gen game engine — not a photograph, a game render. Dynamic cutscene scene in Leonida: two characters confronting each other in a dim Vice City bar, the person behind the wheel of a supercar during a chase, standing on a luxury yacht at night with the city lights behind them, or mid-conversation in a neon-lit strip club back room with other characters present. Cinematic close-to-mid shot. Practical lighting from neon signs, car headlights, or harsh Florida sun through blinds. Shallow depth of field, 35mm virtual lens. Other characters and environment fully rendered at GTA 6 quality. Rockstar colour grade — punchy contrast, warm skin, teal-to-orange palette. No HUD. No health bar. No UI of any kind. Pure cutscene frame."
    ];

    // Pick a random variant each time
    var retroIdx  = Math.floor(Math.random() * retroPrompts.length);
    var modernIdx = Math.floor(Math.random() * modernPrompts.length);
    var prompt = mode === "modern" ? modernPrompts[modernIdx] : retroPrompts[retroIdx];
    console.log("Mode:", mode, "| Variant:", mode === "modern" ? modernIdx + 1 : retroIdx + 1);

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

    // Poll every 2s — Kontext Max takes 6-12s, up to 8 attempts (16s max)
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
