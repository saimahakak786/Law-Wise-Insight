const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo workspace
config.watchFolders = [
  workspaceRoot,
  path.resolve(workspaceRoot, 'node_modules/.pnpm')
];

// 2. Enable symlinks for pnpm monorepos
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// 3. Resolve node modules paths correctly from both project and root pnpm store
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules/.pnpm/node_modules'),
];

module.exports = config;
