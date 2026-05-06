// netlify/functions/poll.js
// Checks fal.ai queue status. Returns COMPLETED + imageUrl when done.

exports.handler = async (event) => {

const FAL_KEY = process.env.FAL_API_KEY
const { requestId } = event.queryStringParameters || {}

if (!requestId) {
return {
statusCode: 400,
headers: { ‘Access-Control-Allow-Origin’: ‘*’ },
body: JSON.stringify({ error: ‘Missing requestId parameter’ }),
}
}

if (!FAL_KEY) {
return {
statusCode: 500,
headers: { ‘Access-Control-Allow-Origin’: ‘*’ },
body: JSON.stringify({ error: ‘FAL_API_KEY not set’ }),
}
}

const BASE = ‘https://queue.fal.run/fal-ai/flux/dev/image-to-image’
const AUTH = { ‘Authorization’: `Key ${FAL_KEY}` }

try {
// Check status
const statusRes = await fetch(`${BASE}/requests/${requestId}/status`, {
headers: AUTH,
})

```
if (!statusRes.ok) {
  throw new Error(`Status check failed (${statusRes.status})`)
}

const statusData = await statusRes.json()

// If done, fetch the actual result
if (statusData.status === 'COMPLETED') {
  const resultRes = await fetch(`${BASE}/requests/${requestId}`, {
    headers: AUTH,
  })

  if (!resultRes.ok) {
    throw new Error(`Result fetch failed (${resultRes.status})`)
  }

  const result = await resultRes.json()
  const imageUrl = result.images?.[0]?.url || null

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ status: 'COMPLETED', imageUrl }),
  }
}

// Still IN_QUEUE or IN_PROGRESS — return status so frontend can keep polling
return {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify({ status: statusData.status }),
}
```

} catch (err) {
console.error(’[poll error]’, err.message)
return {
statusCode: 500,
headers: { ‘Access-Control-Allow-Origin’: ‘*’ },
body: JSON.stringify({ error: err.message }),
}
}
}
