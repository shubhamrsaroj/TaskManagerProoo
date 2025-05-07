/**
 * Helper script to apply consistent color theme throughout the application
 * 
 * Run this to see:
 * 1. All files containing direct color values that should be replaced with theme references
 * 2. Instructions for updating components with the new theme
 * 
 * Usage:
 * node scripts/apply-theme-colors.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color mapping from hardcoded values to theme references
const colorMap = {
  // Blues (from darkest to lightest)
  '#0F172A': 'appColors.background.primary',
  '#1E293B': 'appColors.background.card', 
  '#334155': 'appColors.border.light',
  '#3B82F6': 'appColors.accent.primary',
  '#60A5FA': 'appColors.accent.secondary',
  
  // Text colors
  '#F1F5F9': 'appColors.text.primary',
  '#CBD5E1': 'appColors.text.secondary',
  '#64748B': 'appColors.text.muted',
  
  // Special colors
  '#10B981': 'appColors.accent.success',
  '#8B5CF6': 'appColors.accent.highlight',
  
  // Gradients
  'linear-gradient(135deg, #3B82F6, #8B5CF6)': 'appColors.accent.gradient',
};

// Files to skip
const skipFiles = [
  'node_modules',
  '.next',
  'theme.ts'
];

// Find all tsx/ts files and check for color references
console.log('\nFiles containing hardcoded colors:\n');

try {
  // Use grep to find hardcoded color values
  const command = `grep -r --include="*.tsx" --include="*.ts" --include="*.css" "#[0-9A-Fa-f]\\{6\\}" src`;
  const result = execSync(command, { encoding: 'utf-8' });
  
  console.log(result);
  
  console.log('\n----------------------------------------');
  console.log('Instructions for applying the theme:');
  console.log('----------------------------------------');
  console.log('1. Import the theme colors:');
  console.log('   import { appColors } from \'@/lib/theme\';');
  console.log('\n2. Replace hardcoded colors with theme references:');
  
  for (const [color, replacement] of Object.entries(colorMap)) {
    console.log(`   ${color} → ${replacement}`);
  }
  
  console.log('\n3. For gradients, use template literals:');
  console.log('   background: `linear-gradient(135deg, ${appColors.accent.primary}, ${appColors.accent.highlight})`');
  
  console.log('\n4. For transparency, add hex values:');
  console.log('   80% opacity: `${appColors.accent.primary}CC`');
  console.log('   50% opacity: `${appColors.accent.primary}80`');
  console.log('   20% opacity: `${appColors.accent.primary}33`');
  console.log('   10% opacity: `${appColors.accent.primary}1A`');
  
} catch (error) {
  console.error('Error finding color references:', error.message);
} 