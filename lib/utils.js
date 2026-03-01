const fetch = require('node-fetch');

/**
 * Sends a webhook notification to the specified URL.
 * Ported from verify/verify.php:sendWebhook
 */
async function sendWebhook(data, callbackUrl) {
    if (!callbackUrl) return;

    const results = [];

    // 1. Send JSON payload
    try {
        const jsonRes = await fetch(callbackUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            timeout: 10000
        });
        results.push({ type: 'json', status: jsonRes.status });
    } catch (err) {
        results.push({ type: 'json', error: err.message });
    }

    // 2. Send x-www-form-urlencoded payload
    try {
        const formParams = new URLSearchParams();
        for (const key in data) {
            formParams.append(key, data[key]);
        }
        const formRes = await fetch(callbackUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formParams,
            timeout: 10000
        });
        results.push({ type: 'form', status: formRes.status });
    } catch (err) {
        results.push({ type: 'form', error: err.message });
    }

    return results;
}

module.exports = {
    sendWebhook
};
