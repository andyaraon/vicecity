exports.handler = async function(event) {
  var key = process.env.FAL_API_KEY;
  
  if (!key) {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "FAIL", reason: "FAL_API_KEY is not set in Netlify environment variables" })
    };
  }

  try {
    var res = await fetch("https://rest.fal.run/storage/upload", {
      method: "GET",
      headers: { "Authorization": "Key " + key }
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        status: "KEY_FOUND", 
        keyPreview: key.substring(0, 8) + "...",
        falResponse: res.status
      })
    };
  } catch(err) {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "ERROR", message: err.message })
    };
  }
};
