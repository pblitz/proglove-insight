#!/usr/bin/env node
/**
 * ProGlove Notifications Helper
 * 
 * Usage:
 *   node get-notifications.js [--recent-hours 24]
 *   
 * Examples:
 *   node get-notifications.js              # All notifications
 *   node get-notifications.js --recent-hours 1   # Last 1 hour
 *   node get-notifications.js --recent-hours 24  # Last 24 hours
 *
 * Returns live alerts/notifications with timestamps
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse args
const recentHoursIdx = process.argv.indexOf('--recent-hours');
const recentHours = recentHoursIdx > -1 ? parseInt(process.argv[recentHoursIdx + 1]) : null;

try {
  const result = execSync(
    `node ${__dirname}/insight-api.js newsfeed/insights/narrative/notifications`,
    { encoding: 'utf8' }
  );
  
  const data = JSON.parse(result);
  
  if (!data.notifications || data.notifications.length === 0) {
    console.log('No notifications found.');
    process.exit(0);
  }
  
  const now = Date.now();
  let filtered = data.notifications;
  
  // Filter by time if requested
  if (recentHours !== null) {
    const cutoff = now - (recentHours * 60 * 60 * 1000);
    filtered = data.notifications.filter(n => n.last_notification_timestamp >= cutoff);
  }
  
  // Sort by timestamp (most recent first)
  filtered.sort((a, b) => b.last_notification_timestamp - a.last_notification_timestamp);
  
  console.log(`\n🔔 ProGlove Notifications${recentHours ? ` (last ${recentHours}h)` : ''}\n`);
  console.log(`Total: ${filtered.length} (of ${data.notifications.length} total)\n`);
  
  if (filtered.length === 0) {
    console.log('No recent notifications.\n');
    process.exit(0);
  }
  
  // Group by time buckets
  const buckets = {
    last1h: [],
    last24h: [],
    last7d: [],
    older: []
  };
  
  const oneHourAgo = now - (60 * 60 * 1000);
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  filtered.forEach(notif => {
    const ts = notif.last_notification_timestamp;
    if (ts >= oneHourAgo) buckets.last1h.push(notif);
    else if (ts >= oneDayAgo) buckets.last24h.push(notif);
    else if (ts >= oneWeekAgo) buckets.last7d.push(notif);
    else buckets.older.push(notif);
  });
  
  function formatTime(ms) {
    const date = new Date(ms);
    const minutesAgo = Math.floor((now - ms) / 60000);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    const daysAgo = Math.floor(hoursAgo / 24);
    return `${daysAgo}d ago`;
  }
  
  function displayBucket(title, items) {
    if (items.length === 0) return;
    console.log(`${title} (${items.length}):`);
    items.forEach((n, idx) => {
      const time = formatTime(n.last_notification_timestamp);
      const level = n.level_path.split('#').pop() || 'root';
      console.log(`  ${idx + 1}. 🔔 ${n.insight_id.substring(0, 8)}... [${level}] - ${time}`);
    });
    console.log('');
  }
  
  displayBucket('🔥 Last Hour', buckets.last1h);
  displayBucket('📅 Last 24 Hours', buckets.last24h);
  displayBucket('📆 Last 7 Days', buckets.last7d);
  displayBucket('📁 Older', buckets.older);
  
  // Show top 5 most recent
  console.log('\n🆕 Most Recent (top 5):');
  filtered.slice(0, 5).forEach((n, idx) => {
    const date = new Date(n.last_notification_timestamp);
    const timeStr = date.toISOString().replace('T', ' ').substring(0, 19);
    console.log(`  ${idx + 1}. ${n.insight_id.substring(0, 12)}... [${n.level_path}]`);
    console.log(`     ${timeStr} (${formatTime(n.last_notification_timestamp)})`);
  });
  
  console.log('');
  
} catch (err) {
  console.error('❌ Failed to fetch notifications:', err.message);
  process.exit(1);
}
