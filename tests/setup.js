const path = require('path');
process.env.NODE_CONFIG_DIR = `${__dirname}/../config`;
process.env.ROOT = path.resolve(__dirname, '..');
