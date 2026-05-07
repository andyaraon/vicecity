// netlify/functions/poll.js

exports.handler = async function(event) {

var FAL_KEY = process.env.FAL_API_KEY
var params = event.queryStringParameters || {}
var requestId = params.requestId

if (!requestId) {
return {
statusCode: 400,
headers: { ‘Access-Control-Allow-Origin’: ‘*’ },
body: JSON.stringify({ error: ‘Missing requestId’ })
}
}

if (!FAL_KEY) {
return {
statusCode: 500,
headers: { ‘Access-Control-Allow-Origin’: ‘*’ },
body: JSON.stringify({ error: ‘FAL_API_KEY not set’ })
}
}

var BASE = ‘https://queue.fal.run/fal-ai/flux/dev/image-to-image’
var authHeader = { ‘Authorization’: ’Key ’ + FAL_KEY }

try {
// Check status
var statusRes = await fetch(BASE + ‘/requests/’ + requestId + ‘/status’, {
headers: authHeader
})

```
if (!statusRes.ok) {
  throw new Error('Status check failed ' + statusRes.status)
}

var statusData = await statusRes.json()

if (statusData.status === 'COMPLETED') {
  // Fetch the result
  var resultRes = await fetch(BASE + '/requests/' + requestId, {
    headers: authHeader
  })

  if (!resultRes.ok) {
    throw new Error('Result fetch failed ' + resultRes.status)
  }

  var result = await resultRes.json()
  var imageUrl = (result.images && result.images[0]) ? result.images[0].url : null

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ status: 'COMPLETED', imageUrl: imageUrl })
  }
}

return {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ status: statusData.status })
}
```

} catch (err) {
console.error(’[poll error]’, err.message)
return {
statusCode: 500,
headers: { ‘Access-Control-Allow-Origin’: ‘*’ },
body: JSON.stringify({ error: err.message })
}
}
}