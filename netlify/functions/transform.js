exports.handler = async function(event) {

if (event.httpMethod === “OPTIONS”) {
return { statusCode: 200, headers: corsHeaders(), body: “” };
}

if (event.httpMethod !== “POST”) {
return { statusCode: 405, body: “Method Not Allowed” };
}

var key = process.env.FAL_API_KEY;
if (!key) {
return {
statusCode: 500,
headers: corsHeaders(),
body: JSON.stringify({ error: “FAL_API_KEY not set” })
};
}

try {
console.log(“Step 1: parsing body”);
var parsed = JSON.parse(event.body);
var imageBase64 = parsed.imageBase64;
var mode = parsed.mode || “retro”;

```
if (!imageBase64) {
  return {
    statusCode: 400,
    headers: corsHeaders(),
    body: JSON.stringify({ error: "No image received" })
  };
}

console.log("Step 2: uploading to fal storage, base64 length:", imageBase64.length);
var imageBuffer = Buffer.from(imageBase64, "base64");

var uploadRes = await fetch("https://storage.fal.run/", {
  method: "POST",
  headers: {
    "Authorization": "Key " + key,
    "Content-Type": "image/jpeg"
  },
  body: imageBuffer
});

console.log("Step 3: upload response status:", uploadRes.status);
var uploadData = await uploadRes.json();
console.log("Step 4: upload data:", JSON.stringify(uploadData));

var imageUrl = uploadData.url;
if (!imageUrl) {
  throw new Error("Upload returned no URL: " + JSON.stringify(uploadData));
}

var retroPrompt = "GTA Vice City pixel art 16-bit retro portrait, neon pink and teal, VHS grain, CRT scanlines, Miami 1986 synthwave, arcade game sprite style";
var modernPrompt = "Vice City cinematic portrait, neon noir Miami night, luxury aesthetic, dramatic lighting, hyperrealistic, neon pink and purple glow";
var prompt = mode === "modern" ? modernPrompt : retroPrompt;

console.log("Step 5: submitting to queue with imageUrl:", imageUrl);
var queueRes = await fetch("https://queue.fal.run/fal-ai/flux/dev/image-to-image", {
  method: "POST",
  headers: {
    "Authorization": "Key " + key,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    image_url: imageUrl,
    prompt: prompt,
    strength: 0.85,
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    image_size: "square"
  })
});

console.log("Step 6: queue response status:", queueRes.status);
var queueResult = await queueRes.json();
console.log("Step 7: queue result:", JSON.stringify(queueResult));

if (!queueResult.request_id) {
  throw new Error("Queue failed: " + JSON.stringify(queueResult));
}

return {
  statusCode: 200,
  headers: corsHeaders(),
  body: JSON.stringify({
    requestId: queueResult.request_id,
    statusUrl: queueResult.status_url,
    responseUrl: queueResult.response_url,
    status: queueResult.status
  })
};
```

} catch (err) {
console.error(“TRANSFORM ERROR:”, err.message);
return {
statusCode: 500,
headers: corsHeaders(),
body: JSON.stringify({ error: err.message })
};
}
};

function corsHeaders() {
return {
“Access-Control-Allow-Origin”: “*”,
“Access-Control-Allow-Headers”: “Content-Type”,
“Access-Control-Allow-Methods”: “POST, OPTIONS”,
“Content-Type”: “application/json”
};
}