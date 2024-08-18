const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    content: './src/scripts/content.ts',
    popup: './src/popup/popup.ts', // Only if you have a popup script
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // Clean the output directory before each build
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: '' }, // Copy manifest.json to the root output directory
        { from: 'src/popup', to: '' }, // Copy popup folder to the root output directory
        { from: 'src/images', to: 'images' }, // Copy images folder to the images output directory
      ],
    }),
  ],
};
