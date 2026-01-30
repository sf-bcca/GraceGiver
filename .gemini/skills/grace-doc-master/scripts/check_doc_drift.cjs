#!/usr/bin/env node

/**
 * GraceDoc Master: Drift Checker
 * Scans server/index.js for routes and compares with docs/API_REFERENCE.md
 */

const fs = require('fs');
const path = require('path');

const serverFile = path.resolve(__dirname, '../../../server/index.js');
const apiDocsFile = path.resolve(__dirname, '../../../docs/API_REFERENCE.md');

if (!fs.existsSync(serverFile) || !fs.existsSync(apiDocsFile)) {
    console.error('Error: Required files missing.');
    process.exit(1);
}

const serverContent = fs.readFileSync(serverFile, 'utf8');
const apiDocsContent = fs.readFileSync(apiDocsFile, 'utf8');

// Regex to find Express routes: app.get('/path', ...) or router.post('/path', ...)
const routeRegex = /(?:app|router)\.(get|post|put|delete)\(['"]([^'"]+)['"]/gi;

const routes = [];
let match;
while ((match = routeRegex.exec(serverContent)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2];
    routes.push({ method, path });
}

console.log(`--- API Documentation Drift Audit ---`);
console.log(`Detected ${routes.length} routes in server/index.js\n`);

let missingCount = 0;
routes.forEach(route => {
    // Check if the route (Method + Path) is mentioned in API_REFERENCE.md
    // We search for patterns like "GET /api/members" or "`GET /api/members`"
    const searchPattern = new RegExp(`${route.method}\s+${route.path}`, 'i');
    const isDocumented = searchPattern.test(apiDocsContent);

    if (!isDocumented) {
        console.warn(`⚠️  Undocumented Route: ${route.method} ${route.path}`);
        missingCount++;
    }
});

if (missingCount === 0) {
    console.log('✅ All detected routes are documented in API_REFERENCE.md.');
} else {
    console.log(`\n❌ Found ${missingCount} undocumented route(s). Please update docs/API_REFERENCE.md.`);
}
console.log('------------------------------------');
