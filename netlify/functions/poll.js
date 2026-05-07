exports.handler = async function(event) {

  var key = process.env.FAL_API_KEY;
  var requestId = (event.queryStringParameters || {}).requestId;

  if (!requestId) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing requestId" })
    };
  }

  try {
    var base = "https://queue.fal.run/fal-ai/flux/dev/image-to-image";
    var authHeader = "Key " + key;

    var statusResponse = await fetch(base + "/requests/" + requestId + "/status", {
      headers: { "Authorization": authHeader }
    });

    var statusResult = await statusResponse.json();

    if (statusResult.status === "COMPLETED") {
      var resultResponse = await fetch(base + "/requests/" + requestId, {
        headers: { "Authorization": authHeader }
      });
      var result = await resultResponse.json();
      var imageUrl = result.images && result.images[0] ? result.images[0].url : null;
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED", imageUrl: imageUrl })
      };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusResult.status })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
