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
      // V1 — Street / exterior scene
      "Generate a 3D model screenshot transforming the input image into the distinct retro graphical style of 2002 PlayStation 2 gaming, specifically emulating Grand Theft Auto: Vice City. Preserve the exact subject face, likeness, and pose from the source image, but render everything using primitive low-polygon geometry with highly visible polygonal edges on the face, body, and all objects. All textures must be low-resolution, unfiltered, and blocky — applying a simplified flat-shaded lighting model typical of early 2000s PS2 in-game rendering. Replace all high-fidelity details with the characteristic geometric simplifications and crudely applied texture maps of GTA Vice City RenderWare engine. Place the subject on a Vice City street at dusk — neon-lit boulevard, low-poly palm trees, boxy 80s parked cars, flat-shaded pastel buildings. The entire scene — character, environment, and lighting — must look like an authentic in-game screenshot from GTA Vice City 2002, uniformly PS2 quality throughout. 4:3 aspect ratio. No HUD. No minimap. No health bar. No ammo counter. No game UI of any kind.",
      // V2 — Car / vehicle scene
      "Generate a 3D model screenshot transforming the input image into the distinct retro graphical style of 2002 PlayStation 2 gaming, specifically emulating Grand Theft Auto: Vice City. Preserve the exact subject face, likeness, and pose from the source image, but render everything using primitive low-polygon geometry with highly visible polygonal edges on the face, body, and all objects. All textures must be low-resolution, unfiltered, and blocky — applying a simplified flat-shaded lighting model typical of early 2000s PS2 in-game rendering. Place the subject inside or leaning on a low-poly boxy 1980s Vice City car — either sitting in the driver seat viewed through the windshield, or standing beside a parked car on a flat-shaded Vice City street. The car, interior, and all environment assets must be rendered at authentic PS2 polygon quality — crude geometry, flat textures, no reflections, no realism. The entire scene must look like an authentic in-game screenshot from GTA Vice City 2002. 4:3 aspect ratio. No HUD. No minimap. No health bar. No ammo counter. No game UI of any kind.",
      // V3 — Close-up portrait render
      "Generate a 3D model screenshot transforming the input image into the distinct retro graphical style of 2002 PlayStation 2 gaming, specifically emulating Grand Theft Auto: Vice City. Preserve the exact subject face, likeness, and pose from the source image, but render everything using primitive low-polygon geometry with highly visible polygonal edges — especially on the face, jawline, cheeks, and forehead. All skin textures must be low-resolution, flat-shaded, and blocky with the characteristic crude texture mapping of GTA Vice City PS2 character models. Close-up portrait framing of the character, similar to a Vice City NPC conversation cutscene — face filling most of the frame, Vice City environment softly visible in the background: a sun-lit street, a club interior, or a waterfront dock, all rendered at PS2 polygon quality. The entire scene must look like an authentic in-game close-up screenshot from GTA Vice City 2002. 4:3 aspect ratio. No HUD. No minimap. No health bar. No ammo counter. No game UI of any kind."
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
