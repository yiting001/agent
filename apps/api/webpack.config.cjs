const { resolve } = require('node:path');

module.exports = (options) => ({
  ...options,
  devtool: false,
  externals: {
    '@zvec/zvec': 'commonjs @zvec/zvec',
    'better-sqlite3': 'commonjs better-sqlite3',
    'pdf-parse': 'commonjs pdf-parse',
  },
  output: {
    ...options.output,
    clean: true,
    filename: 'server.js',
    path: resolve(__dirname, 'dist-single'),
  },
});
