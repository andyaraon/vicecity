exports.handler = async function(event) {

var key = process.env.FAL_API_KEY;
var params = event.queryStringParameters || {};
var statusUrl = params.statusUrl;
var responseUrl = params.responseUrl;

if (!statusUrl || !responseUrl) {
return {
statusCode: 400,
headers: { “Access-Control-Allow-Origin”: “*”, “Content-Type”: “application/json” },
body: JSON.stringify({ error: “Missing statusUrl or responseUrl” })
};
}

try {
var statusResponse = await fetch(statusUrl, {
headers: { “Authorization”: “Key “ + key }
});

```
var statusResult = await statusResponse.json();

if (statusResult.status === "COMPLETED") {
  var resultResponse = await fetch(responseUrl, {
    headers: { "Authorization": "Key " + key }
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
```

} catch (err) {
return {
statusCode: 500,
headers: { “Access-Control-Allow-Origin”: “*”, “Content-Type”: “application/json” },
body: JSON.stringify({ error: err.message })
};
}
};