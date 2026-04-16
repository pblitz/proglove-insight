#!/usr/bin/env node
/**
 * ProGlove INSIGHT API Wrapper
 * 
 * Usage:
 *   node insight-api.js <endpoint> [--method GET|POST] [--body <json>]
 *   
 * Examples:
 *   node insight-api.js devices
 *   node insight-api.js devices/abc123
 *   node insight-api.js analytics/workers
 *   node insight-api.js devices --method POST --body '{"name":"Scanner1"}'
 *
 * Auto-refreshes tokens if expired.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || process.env.USERPROFILE;
const TOKEN_PATH = path.join(HOME, '.proglove-tokens.json');
const AUTH_SCRIPT = path.join(__dirname, 'auth.js');

// Parse args
const endpoint = process.argv[2];
const methodIdx = process.argv.indexOf('--method');
const bodyIdx = process.argv.indexOf('--body');
const method = methodIdx > -1 ? process.argv[methodIdx + 1] : 'GET';
const body = bodyIdx > -1 ? process.argv[bodyIdx + 1] : null;

if (!endpoint) {
  console.error('Usage: node insight-api.js <endpoint> [--method GET|POST] [--body <json>]');
  process.exit(1);
}

function loadTokens() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error(`Tokens not found. Run: node ${AUTH_SCRIPT}`);
  }
  return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
}

function isTokenExpired(tokens) {
  return Date.now() >= tokens.expiresAt - 60000; // Refresh 1 min before expiry
}

async function refreshToken(tokens) {
  console.error('[refresh] Token expired, refreshing...');
  
  const body = {
    AuthFlow: 'REFRESH_TOKEN',
    ClientId: tokens.clientId,
    AuthParameters: {
      REFRESH_TOKEN: tokens.RefreshToken,
    },
  };

  const endpoint = `https://cognito-idp.${tokens.region}.amazonaws.com/`;
  const data = await httpsRequest(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify(body),
  });

  if (!data.AuthenticationResult) {
    throw new Error('Token refresh failed: ' + JSON.stringify(data));
  }

  const { IdToken, ExpiresIn } = data.AuthenticationResult;
  
  // Update stored tokens
  const updated = {
    ...tokens,
    IdToken,
    ExpiresIn,
    expiresAt: Date.now() + (ExpiresIn * 1000),
    updatedAt: new Date().toISOString(),
  };
  
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
  console.error('[refresh] ✓ Token refreshed');
  
  return updated;
}

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function callApi(tokens, endpoint, method, body) {
  const url = `${tokens.baseUrl}/${endpoint.replace(/^\//, '')}`;
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${tokens.IdToken}`,
      'X-Customer-ID': tokens.customerId,
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = body;
  }
  
  return await httpsRequest(url, options);
}

async function main() {
  try {
    let tokens = loadTokens();
    
    if (isTokenExpired(tokens)) {
      tokens = await refreshToken(tokens);
    }
    
    const result = await callApi(tokens, endpoint, method, body);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ API call failed:', err.message);
    process.exit(1);
  }
}

main();
