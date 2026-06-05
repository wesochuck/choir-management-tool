/// <reference path="../pb_data/types.d.ts" />

// TEMPORARY SPIKE — Delete after testing $http.send() on PocketHost.
// Admin-only endpoint that makes a simple outbound GET to verify
// the Goja VM can reach external services.

routerAdd("GET", "/api/test/http-spike", (e) => {
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") {
        return e.json(403, { error: "Forbidden: Admins only" });
    }

    try {
        const res = $http.send({
            url: "https://httpbin.org/get",
            method: "GET",
            headers: { "Accept": "application/json" },
            timeout: 10,
        });

        return e.json(200, {
            success: true,
            statusCode: res.statusCode,
            bodySnippet: JSON.stringify(res.json).substring(0, 500),
            message: "$http.send() works! Outbound HTTP is available.",
        });
    } catch (err) {
        return e.json(200, {
            success: false,
            error: String(err),
            message: "$http.send() FAILED. Outbound HTTP is blocked or unavailable.",
        });
    }
});
