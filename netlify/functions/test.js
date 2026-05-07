exports.handler = async function(event) {
var key = process.env.FAL_API_KEY;

if (!key) {
return {
statusCode: 200,
body: JSON.stringify({ step: 1, status: “FAIL”, reason: “FAL_API_KEY not set in Netlify” })
};
}

// Step 1 - can we reach fal.ai at all?
try {
var ping = await fetch(“https://fal.run/”, { method: “GET” });
// Step 2 - try the queue endpoint with the key
try {
var auth = await fetch(“https://queue.fal.run/fal-ai/flux/dev/image-to-image”, {
method: “GET”,
headers: { “Authorization”: “Key “ + key }
});
return {
statusCode: 200,
body: JSON.stringify({
step: “ALL_GOOD”,
keyFound: true,
keyPreview: key.substring(0, 10) + “…”,
falReachable: true,
authStatus: auth.status
})
};
} catch(authErr) {
return {
statusCode: 200,
body: JSON.stringify({ step: 2, status: “AUTH_FAIL”, falReachable: true, error: authErr.message })
};
}
} catch(pingErr) {
return {
statusCode: 200,
body: JSON.stringify({ step: 1, status: “CANNOT_REACH_FAL”, error: pingErr.message })
};
}
};