const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const shared = path.resolve(__dirname, '../api/src');
const places = path.resolve(__dirname, '../api/data');
config.watchFolders = [...(config.watchFolders || []), shared, places];

module.exports = config;
