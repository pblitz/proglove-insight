#!/usr/bin/env node
/**
 * ProGlove INSIGHT Authentication Helper
 * 
 * Usage:
 *   CUSTOMER_ID=demo0001 USERNAME=user@example.com PASSWORD=xxx node proglove-auth.js
 *   
 * Or with args:
 *   node proglove-auth.js <customer-id> <username> <password>
 *
 * Stores tokens in ~/.proglove-tokens.json
 * Updates ~/.mcporter/mcporter.json with fresh Bearer token
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || process.env.USERPROFILE;
const TOKEN_PATH = path.join(HOME, '.proglove-tokens.json');
const MCPORTER_CONFIG = path.join(HOME, '.mcporter', 'mcporter.json');

// Parse args
const customerId = process.argv[2] || process.env.CUSTOMER_ID;
const username = process.argv[3] || process.env.USERNAME;
const password = process.argv[4] || process.env.PASSWORD;

if (!customerId || !username || !password) {
  console.error('Usage: CUSTOMER_ID=xxx USERNAME=xxx PASSWORD=xxx node proglove-auth.js');
  console.error('   or: node proglove-auth.js <customer-id> <username> <password>');
  process.exit(1);
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

async function getCustomerApiUrl(customerId) {
  console.log(`[1/4] Fetching API URL for customer: ${customerId}`);
  const data = await httpsRequest(`https://dm4yh0zboe.execute-api.eu-west-1.amazonaws.com/latest/customers/${customerId}`);
  console.log(`✓ API URL: ${data.api_url}`);
  return data.api_url;
}

async function getAuthInfo(baseUrl, customerId) {
  console.log(`[2/4] Fetching auth info...`);
  const data = await httpsRequest(`${baseUrl}/auth-information?id=${customerId}`);
  console.log(`✓ User Pool Client ID: ${data.user_pool_client_id}`);
  return data;
}

async function login(region, clientId, username, password) {
  console.log(`[3/4] Logging in with username/password...`);
  const body = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };

  const endpoint = `https://cognito-idp.${region}.amazonaws.com/`;
  const data = await httpsRequest(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify(body),
  });

  if (!data.AuthenticationResult) {
    throw new Error('Login failed: ' + JSON.stringify(data));
  }

  const { IdToken, RefreshToken, ExpiresIn } = data.AuthenticationResult;
  console.log(`✓ Logged in. Token expires in ${ExpiresIn}s (~${Math.floor(ExpiresIn / 60)} minutes)`);
  return { IdToken, RefreshToken, ExpiresIn, region, clientId };
}

function saveTokens(tokens, customerId, baseUrl) {
  const payload = {
    customerId,
    baseUrl,
    ...tokens,
    expiresAt: Date.now() + (tokens.ExpiresIn * 1000),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(payload, null, 2));
  console.log(`✓ Tokens saved to ${TOKEN_PATH}`);
  return payload;
}

function updateMcporterConfig(idToken, customerId, baseUrl) {
  console.log(`[4/4] Updating mcporter config...`);
  
  if (!fs.existsSync(MCPORTER_CONFIG)) {
    console.warn(`⚠ mcporter config not found at ${MCPORTER_CONFIG}`);
    return;
  }

  const config = JSON.parse(fs.readFileSync(MCPORTER_CONFIG, 'utf8'));
  
  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers['insight-mcp'] = {
    baseUrl: `${baseUrl}/mcp`,
    headers: {
      Authorization: `Bearer ${idToken}`,
      'X-Customer-ID': customerId,
      'X-Insight-Base-URL': baseUrl,
    },
  };

  fs.writeFileSync(MCPORTER_CONFIG, JSON.stringify(config, null, 2));
  console.log(`✓ mcporter config updated with fresh Bearer token`);
}

async function main() {
  try {
    const baseUrl = await getCustomerApiUrl(customerId);
    const authInfo = await getAuthInfo(baseUrl, customerId);
    const tokens = await login(authInfo.region, authInfo.user_pool_client_id, username, password);
    const saved = saveTokens(tokens, customerId, baseUrl);
    updateMcporterConfig(saved.IdToken, customerId, baseUrl);
    
    console.log('\n🎉 Authentication complete!');
    console.log(`   Token valid for ~${Math.floor(saved.ExpiresIn / 60)} minutes`);
    console.log(`   RefreshToken stored for auto-renewal\n`);
  } catch (err) {
    console.error('❌ Authentication failed:', err.message);
    process.exit(1);
  }
}

main();
