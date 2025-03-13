/**
 * This script modifies the TypeScript configuration for Docker builds
 * to avoid issues with dependencies like @fleet-sdk/common
 */
const fs = require('fs');
const path = require('path');

const tsConfigPath = path.join(__dirname, 'tsconfig.json');

// Read the current tsconfig.json
const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));

// Add skipLibCheck to avoid errors in node_modules
tsConfig.compilerOptions.skipLibCheck = true;

// Write the updated tsconfig.json back
fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));

console.log('Updated tsconfig.json for Docker build with skipLibCheck=true'); 