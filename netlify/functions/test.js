exports.handler = async function(event) {
  var key = process.env.FAL_API_KEY;

  if (!key) {
    return {
      statusCode: 200,
      body: JSON.stringify({ result: "FAIL", reason: "FAL_API_KEY not set in Netlify env vars" })
    };
  }

  try {
    var res = await fetch("https://queue.fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        "Authorization": "Key " + key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ test: true })
    });
    var data = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify({
        result: "KEY_WORKS",
        keyPreview: key.substring(0, 8) + "...",
        falStatus: res.status,
        falResponse: data
      })
    };
  } catch(err) {
    return {
      statusCode: 200,
      body: JSON.stringify({ result: "NETWORK_ERROR", error: err.message })
    };
  }
};
