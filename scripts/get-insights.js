#!/usr/bin/env node
/**
 * ProGlove Insights/Narratives Helper
 * 
 * Usage:
 *   node get-insights.js [level_id]
 *   
 * Examples:
 *   node get-insights.js           # All levels (default: _)
 *   node get-insights.js 333d9d    # Specific level
 *
 * Returns formatted insights with sentiment and status
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const levelQuery = process.argv[2] || '_';

let levelId = levelQuery;
let levelName = levelQuery;

try {
  // Try to resolve level name to ID if not "_"
  if (levelQuery !== '_' && !/^[a-f0-9]{6}$/i.test(levelQuery)) {
    console.error(`[resolve] Resolving level: ${levelQuery}...`);
    const levelResult = execSync(
      `node ${__dirname}/resolve-level.js "${levelQuery}"`,
      { encoding: 'utf8' }
    );
    const level = JSON.parse(levelResult);
    levelId = level.id;
    levelName = level.name;
    console.error(`✓ Found: ${levelName} (${levelId})\n`);
  }
  
  const result = execSync(
    `node ${__dirname}/insight-api.js newsfeed/insights/narrative/level/${levelId}`,
    { encoding: 'utf8' }
  );
  
  const data = JSON.parse(result);
  
  if (!data.insights || data.insights.length === 0) {
    console.log('No insights found.');
    process.exit(0);
  }
  
  console.log(`\n📊 ProGlove Insights (Level: ${levelName})\n`);
  console.log(`Total: ${data.insights.length}\n`);
  
  // Group by sentiment
  const bySentiment = {
    POSITIVE: [],
    NEUTRAL: [],
    NEGATIVE: []
  };
  
  data.insights.forEach(insight => {
    const sentiment = insight.sentiment || 'NEUTRAL';
    if (bySentiment[sentiment]) {
      bySentiment[sentiment].push(insight);
    }
  });
  
  // Display grouped
  if (bySentiment.POSITIVE.length > 0) {
    console.log(`✅ Positive (${bySentiment.POSITIVE.length}):`);
    bySentiment.POSITIVE.forEach((i, idx) => {
      const status = i.new ? '🆕' : i.solved ? '✔️' : '📌';
      console.log(`  ${idx + 1}. ${status} ${i.template?.label || 'Insight'} (rank: ${i.rank})`);
    });
    console.log('');
  }
  
  if (bySentiment.NEGATIVE.length > 0) {
    console.log(`⚠️  Negative (${bySentiment.NEGATIVE.length}):`);
    bySentiment.NEGATIVE.forEach((i, idx) => {
      const status = i.new ? '🆕' : i.solved ? '✔️' : '📌';
      console.log(`  ${idx + 1}. ${status} ${i.template?.label || 'Warning'} (rank: ${i.rank})`);
    });
    console.log('');
  }
  
  if (bySentiment.NEUTRAL.length > 0) {
    console.log(`ℹ️  Neutral (${bySentiment.NEUTRAL.length}):`);
    bySentiment.NEUTRAL.forEach((i, idx) => {
      const status = i.new ? '🆕' : i.solved ? '✔️' : '📌';
      console.log(`  ${idx + 1}. ${status} ${i.template?.label || 'Info'} (rank: ${i.rank})`);
    });
    console.log('');
  }
  
  // Show top 3 new insights
  const newInsights = data.insights.filter(i => i.new).slice(0, 3);
  if (newInsights.length > 0) {
    console.log(`\n🆕 New Insights (top ${newInsights.length}):`);
    newInsights.forEach((i, idx) => {
      console.log(`  ${idx + 1}. [${i.sentiment}] ${i.template?.label || i.id}`);
      console.log(`     Rank: ${i.rank}, Status: ${i.status}`);
    });
  }
  
  console.log('');
  
} catch (err) {
  console.error('❌ Failed to fetch insights:', err.message);
  process.exit(1);
}
