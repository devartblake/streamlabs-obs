const webpack = require('webpack');
const merge = require('webpack-merge');
const baseConfig = require('./webpack.base.config.js');
const path = require('path');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const { CheckerPlugin } = require('awesome-typescript-loader');

const plugins = [];

if (process.env.SLOBS_FORKED_TYPECHECKING) plugins.push(new CheckerPlugin());
if (!process.env.CI) plugins.push(new HardSourceWebpackPlugin());

// Use the source map plugin so we canoverride source map location
// The bundle updater serves the maps in development
plugins.push(
  new webpack.SourceMapDevToolPlugin({
    filename: '[file].map',
    publicPath: 'http://localhost:9000/',
  }),
);

module.exports = merge.smart(baseConfig, {
  entry: {
    renderer: './app/app.ts',
    updater: './updater/mac/ui.js',
    'guest-api': './guest-api',
  },

  mode: 'development',
  devtool: 'source-map',
  watchOptions: { ignored: /node_modules/ },

  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader',
        options: { useCache: true, forceIsolatedModules: true, reportFiles: ['app/**/*.ts'] },
        exclude: /node_modules|vue\/src/,
      },
      {
        test: /\.tsx$/,
        include: path.resolve(__dirname, 'app/components'),
        loader: [
          'babel-loader',
          {
            loader: 'awesome-typescript-loader',
            options: {
              forceIsolatedModules: true,
              reportFiles: ['app/components/**/*.tsx'],
              configFileName: 'tsxconfig.json',
              instance: 'tsx-loader',
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?$/,
        enforce: 'pre',
        loader: 'eslint-loader',
      },
    ],
  },

  plugins,
});
