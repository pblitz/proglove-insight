#!/usr/bin/env node
/**
 * ProGlove Devices by Level
 * 
 * List devices filtered by level name or ID.
 * 
 * Usage:
 *   node devices-by-level.js <level-name-or-id> [--online|--offline]
 *   
 * Examples:
 *   node devices-by-level.js Tradefair
 *   node devices-by-level.js 333d9d
 *   node devices-by-level.js Tradefair --online
 *   node devices-by-level.js Modex --offline
 *
 * Returns devices filtered by level with status summary
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const levelQuery = process.argv[2];
const statusFilter = process.argv[3]; // --online or --offline

if (!levelQuery) {
  console.error('Usage: node devices-by-level.js <level-name-or-id> [--online|--offline]');
  process.exit(1);
}

try {
  // Resolve level name/ID
  console.error(`[1/2] Resolving level: ${levelQuery}...`);
  const levelResult = execSync(
    `node ${__dirname}/resolve-level.js "${levelQuery}"`,
    { encoding: 'utf8' }
  );
  
  const level = JSON.parse(levelResult);
  console.error(`✓ Found: ${level.name} (${level.id})`);
  
  // Fetch all devices
  console.error('[2/2] Fetching devices...');
  const devicesResult = execSync(
    `node ${__dirname}/insight-api.js devices`,
    { encoding: 'utf8' }
  );
  
  const devicesData = JSON.parse(devicesResult);
  
  // Filter devices by level path
  // Device path format: "_#333d9d#014e54#PiHWqVqwGO"
  // Level path format: ["_", "333d9d"]
  const levelPathStr = level.path.join('#');
  
  let filtered = devicesData.items.filter(device => {
    const devicePath = device.path || '';
    return devicePath.startsWith(levelPathStr);
  });
  
  console.error(`✓ Found ${filtered.length} devices in level ${level.name}\n`);
  
  // Apply status filter
  if (statusFilter === '--online') {
    filtered = filtered.filter(d => d.state === 'ONLINE');
  } else if (statusFilter === '--offline') {
    filtered = filtered.filter(d => d.state !== 'ONLINE');
  }
  
  // Calculate stats
  const stats = {
    total: filtered.length,
    online: filtered.filter(d => d.state === 'ONLINE').length,
    offline: filtered.filter(d => d.state === 'OFFLINE').length,
    offline7d: filtered.filter(d => d.state === 'OFFLINE_FOR_7_DAYS').length
  };
  
  // Display
  console.log(`📱 Devices in "${level.name}" (${level.id})\n`);
  console.log(`Total: ${stats.total}`);
  console.log(`  🟢 Online: ${stats.online}`);
  console.log(`  🔴 Offline: ${stats.offline}`);
  console.log(`  ⚫ Offline >7d: ${stats.offline7d}\n`);
  
  if (filtered.length === 0) {
    console.log('No devices found.\n');
    process.exit(0);
  }
  
  // List devices
  filtered.forEach((device, idx) => {
    const statusIcon = device.state === 'ONLINE' ? '🟢' : 
                       device.state === 'OFFLINE' ? '🔴' : '⚫';
    const battery = device.battery ? `${device.battery}%` : 'N/A';
    const model = device.model || 'Unknown';
    const lastActivity = device.last_activity_time 
      ? new Date(device.last_activity_time).toISOString().substring(0, 19).replace('T', ' ')
      : 'N/A';
    
    console.log(`${idx + 1}. ${statusIcon} ${device.id} [${model}]`);
    console.log(`   Battery: ${battery}, Last activity: ${lastActivity}`);
    console.log(`   Path: ${device.path}`);
  });
  
  console.log('');
  
} catch (err) {
  console.error('❌ Failed to list devices:', err.message);
  process.exit(1);
}
