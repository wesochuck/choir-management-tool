# Sentinel's Security Journal

This journal tracks critical security learnings, patterns, and constraints specific to the Choir Management Tool codebase.
## 2026-05-19 - PocketBase Filter Injection
**Vulnerability:** Directly interpolating dynamic parameters into PocketBase query filters using string templates creates potential filter injection vulnerabilities (akin to SQL injection), which could lead to authorization bypasses or unintended data exposure.
**Learning:** The PocketBase JS SDK provides a safe `pb.filter` utility which correctly parameters/escapes filter variables.
**Prevention:** Avoid string interpolation inside collection filter options. Use `pb.filter('field = {:param}', { param })` instead.
