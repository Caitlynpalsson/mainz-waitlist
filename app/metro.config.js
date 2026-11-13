const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const shared = path.resolve(__dirname, '../api/src');
config.watchFolders = [...(config.watchFolders || []), shared];

module.exports = config;
