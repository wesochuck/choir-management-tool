/// <reference path="../pb_data/types.d.ts" />

// TEMPORARY SPIKE — Delete after testing raw body access for webhook signature verification.
// Unauthenticated (like a real Stripe webhook would be) — protected by a test secret instead.
//
// Test with:
//   curl -X POST https://choir-manager.pockethost.io/api/test/raw-body-spike \
//     -H "Content-Type: application/json" \
//     -H "X-Test-Signature: COMPUTED_HMAC" \
//     -d '{"event":"checkout.session.completed","id":"cs_test_123"}'
//
// The endpoint tries multiple methods to access the raw request body and reports which work.

routerAdd("POST", "/api/test/raw-body-spike", (e) => {
    const TEST_SECRET = "spike_test_secret_2024";
    const results = {
        methods: {},
        signatureTest: {},
    };

    // ---- Attempt multiple raw body access methods ----

    // Method 1: readerToString(e.request.body)
    try {
        var rawBody = readerToString(e.request.body);
        results.methods.readerToString = {
            success: true,
            length: rawBody.length,
            snippet: rawBody.substring(0, 300),
        };
    } catch (err) {
        results.methods.readerToString = { success: false, error: String(err) };
    }

    // Method 2: toString(e.request.body)
    try {
        var rawBody2 = toString(e.request.body);
        results.methods.toString = {
            success: true,
            length: rawBody2.length,
            snippet: rawBody2.substring(0, 300),
        };
    } catch (err) {
        results.methods.toString = { success: false, error: String(err) };
    }

    // Method 3: String(e.request.body)
    try {
        var rawBody3 = String(e.request.body);
        results.methods.stringCast = {
            success: true,
            length: rawBody3.length,
            snippet: rawBody3.substring(0, 300),
        };
    } catch (err) {
        results.methods.stringCast = { success: false, error: String(err) };
    }

    // Method 4: e.requestInfo().body (parsed JSON) re-serialized
    try {
        var parsed = e.requestInfo().body;
        var reserialized = JSON.stringify(parsed);
        results.methods.parsedReserialized = {
            success: true,
            length: reserialized.length,
            snippet: reserialized.substring(0, 300),
            note: "WARNING: re-serialized JSON may differ from original (key order, spacing). Not safe for HMAC.",
        };
    } catch (err) {
        results.methods.parsedReserialized = { success: false, error: String(err) };
    }

    // Method 5: requestInfo keys inspection
    try {
        var info = e.requestInfo();
        results.methods.requestInfoKeys = {
            success: true,
            availableKeys: Object.keys(info),
        };
    } catch (err) {
        results.methods.requestInfoKeys = { success: false, error: String(err) };
    }

    // ---- Signature verification simulation ----
    // Pick the best raw body we found and try to compute + verify HMAC
    var bestRawBody = "";
    if (results.methods.readerToString && results.methods.readerToString.success && results.methods.readerToString.length > 0) {
        bestRawBody = rawBody;
        results.signatureTest.sourceMethod = "readerToString";
    } else if (results.methods.toString && results.methods.toString.success && results.methods.toString.length > 0) {
        bestRawBody = rawBody2;
        results.signatureTest.sourceMethod = "toString";
    } else if (results.methods.stringCast && results.methods.stringCast.success && results.methods.stringCast.length > 0) {
        bestRawBody = rawBody3;
        results.signatureTest.sourceMethod = "stringCast";
    }

    if (bestRawBody) {
        try {
            // Simulate Stripe's signing scheme: HMAC-SHA256(timestamp + "." + body, secret)
            var timestamp = Math.floor(Date.now() / 1000);
            var signedPayload = timestamp + "." + bestRawBody;
            var computedSig = $security.hs256(signedPayload, TEST_SECRET);

            results.signatureTest.success = true;
            results.signatureTest.rawBodyLength = bestRawBody.length;
            results.signatureTest.rawBodySnippet = bestRawBody.substring(0, 200);
            results.signatureTest.computedSignature = computedSig;
            results.signatureTest.timestamp = timestamp;
        } catch (err) {
            results.signatureTest.success = false;
            results.signatureTest.error = String(err);
        }
    } else {
        results.signatureTest.success = false;
        results.signatureTest.error = "No raw body method produced usable output";
    }

    // ---- Verify header access (Stripe sends Stripe-Signature header) ----
    try {
        var headers = e.requestInfo().headers;
        results.headerAccess = {
            success: true,
            testSignatureHeader: headers["x-test-signature"] || headers["X-Test-Signature"] || "(not found)",
            contentType: headers["content-type"] || headers["Content-Type"] || "(not found)",
        };
    } catch (err) {
        results.headerAccess = { success: false, error: String(err) };
    }

    return e.json(200, results);
});
