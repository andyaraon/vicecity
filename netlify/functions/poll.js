exports.handler = async function(event) {
var key = process.env.FAL_API_KEY;
var params = event.queryStringParameters || {};
var statusUrl = params.statusUrl;
var responseUrl = params.responseUrl;
if (!statusUrl || !responseUrl) {
return { statusCode: 400, headers: { “Access-Control-Allow-Origin”: “*”, “Content-Type”: “application/json” }, body: JSON.stringify({ error: “Missing urls” }) };
}
try {
var statusRes = await fetch(decodeURIComponent(statusUrl), {
headers: { “Authorization”: “Key “ + key }
});
var statusData = await statusRes.json();
if (statusData.status === “COMPLETED”) {
var resultRes = await fetch(decodeURIComponent(responseUrl), {
headers: { “Authorization”: “Key “ + key }
});
var result = await resultRes.json();
var imageUrl = result.images && result.images[0] ? result.images[0].url : null;
return { statusCode: 200, headers: { “Access-Control-Allow-Origin”: “*”, “Content-Type”: “application/json” }, body: JSON.stringify({ status: “COMPLETED”, imageUrl: imageUrl }) };
}
return { statusCode: 200, headers: { “Access-Control-Allow-Origin”: “*”, “Content-Type”: “application/json” }, body: JSON.stringify({ status: statusData.status }) };
} catch (err) {
return { statusCode: 500, headers: { “Access-Control-Allow-Origin”: “*”, “Content-Type”: “application/json” }, body: JSON.stringify({ error: err.message }) };
}
};