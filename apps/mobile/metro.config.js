const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. 모노레포 워크스페이스 설정
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 2. 모노레포 패키지 디스매칭 설정
config.resolver.disableHierarchicalLookup = true;

// 3. NativeWind 설정
module.exports = withNativeWind(config, { input: './global.css' }); 