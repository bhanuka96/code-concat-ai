//@ts-check

'use strict';

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');    // ← import the plugin

/** @typedef {import('webpack').Configuration} WebpackConfig */

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node',
  mode: 'none',

  entry: './src/extension.ts',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },

  externals: {
    vscode: 'commonjs vscode'
  },

  resolve: {
    extensions: ['.ts', '.js']
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [{ loader: 'ts-loader' }]
      },
      {
        test: /\.svg$/,                          // ← handle SVG imports
        type: 'asset/resource',
        generator: {
          filename: 'resources/[name][ext]'      // place into dist/resources/
        }
      }
    ]
  },

  plugins: [
    // copy entire resources/ folder (e.g. your icon.svg) into dist/resources/
    new CopyPlugin({
      patterns: [
        { from: 'resources', to: 'resources' }
      ]
    })
  ],

  devtool: 'nosources-source-map',

  infrastructureLogging: {
    level: 'log'
  }
};

module.exports = [extensionConfig];