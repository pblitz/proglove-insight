#!/usr/bin/env node
/**
 * ProGlove Level Resolver
 * 
 * Resolves level names to level IDs using the organization hierarchy.
 * Caches results for 1 hour to avoid repeated API calls.
 * 
 * Usage:
 *   node resolve-level.js <name-or-id>
 *   
 * Examples:
 *   node resolve-level.js Tradefair
 *   node resolve-level.js 333d9d
 *   node resolve-level.js --list          # List all levels
 *   node resolve-level.js --refresh       # Force refresh cache
 *
 * Returns JSON: {"id": "333d9d", "name": "Tradefair", "path": ["_", "333d9d"]}
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || process.env.USERPROFILE;
const CACHE_PATH = path.join(HOME, '.proglove-levels-cache.json');
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const query = process.argv[2];
const listMode = query === '--list';
const refreshMode = query === '--refresh';

function fetchLevels() {
  const result = execSync(
    `node ${__dirname}/insight-api.js gateways/organisation?entity_type=LEVEL`,
    { encoding: 'utf8' }
  );
  
  const data = JSON.parse(result);
  const levels = data.items.map(item => item.node);
  
  return levels;
}

function loadCache() {
  if (!fs.existsSync(CACHE_PATH)) return null;
  
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  
  // Check if expired
  if (Date.now() - cache.timestamp > CACHE_TTL_MS) {
    return null;
  }
  
  return cache.levels;
}

function saveCache(levels) {
  const cache = {
    timestamp: Date.now(),
    levels
  };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function getLevels() {
  if (refreshMode) {
    console.error('[cache] Forcing refresh...');
    const levels = fetchLevels();
    saveCache(levels);
    return levels;
  }
  
  let levels = loadCache();
  
  if (!levels) {
    console.error('[cache] Cache miss or expired, fetching from API...');
    levels = fetchLevels();
    saveCache(levels);
    console.error(`[cache] Cached ${levels.length} levels`);
  } else {
    console.error(`[cache] Using cached data (${levels.length} levels)`);
  }
  
  return levels;
}

function findLevel(levels, query) {
  // Try exact ID match first
  let level = levels.find(l => l.id === query);
  if (level) return level;
  
  // Try exact name match (case-insensitive)
  const lowerQuery = query.toLowerCase();
  level = levels.find(l => l.name.toLowerCase() === lowerQuery);
  if (level) return level;
  
  // Try partial name match
  level = levels.find(l => l.name.toLowerCase().includes(lowerQuery));
  if (level) return level;
  
  return null;
}

function listLevels(levels) {
  console.log('\n📊 ProGlove Organization Levels\n');
  
  // Group by depth
  const byDepth = {};
  levels.forEach(level => {
    if (!byDepth[level.depth]) byDepth[level.depth] = [];
    byDepth[level.depth].push(level);
  });
  
  Object.keys(byDepth).sort((a, b) => a - b).forEach(depth => {
    const items = byDepth[depth];
    const indent = '  '.repeat(parseInt(depth));
    
    items.forEach(level => {
      const pathStr = level.path.join(' → ');
      console.log(`${indent}${level.name} (${level.id})`);
    });
  });
  
  console.log(`\nTotal: ${levels.length} levels\n`);
}

try {
  const levels = getLevels();
  
  if (refreshMode) {
    console.log(`✓ Cache refreshed: ${levels.length} levels`);
    process.exit(0);
  }
  
  if (listMode) {
    listLevels(levels);
    process.exit(0);
  }
  
  if (!query) {
    console.error('Usage: node resolve-level.js <name-or-id>');
    console.error('   or: node resolve-level.js --list');
    console.error('   or: node resolve-level.js --refresh');
    process.exit(1);
  }
  
  const level = findLevel(levels, query);
  
  if (!level) {
    console.error(`❌ Level not found: ${query}`);
    process.exit(1);
  }
  
  // Output JSON for scripting
  console.log(JSON.stringify({
    id: level.id,
    name: level.name,
    path: level.path,
    depth: level.depth
  }, null, 2));
  
} catch (err) {
  console.error('❌ Failed to resolve level:', err.message);
  process.exit(1);
}
