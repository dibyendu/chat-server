const merge = require('webpack-merge'),
webpack = require('webpack'),
ExtractTextPlugin = require('extract-text-webpack-plugin'),
HtmlWebpackPlugin = require('html-webpack-plugin'),
commonConfiguration = require('./webpack.common.js')

commonConfiguration._extractTextPluginOption.use.map(obj => {
  if (obj.options)
  obj.options.sourceMap = true
  else
  obj.options = { sourceMap: true }
})

let configuration = merge.smart(commonConfiguration, {
  mode: 'development',
  output: {
    filename: '[name].[hash:16].js',
  },
  devtool: 'source-map',
  devServer: {
    port: 4000,
    hot: true,
    hotOnly: true
  },
  plugins: [
    new webpack.NamedModulesPlugin(),
    new webpack.HotModuleReplacementPlugin()
  ].concat(
    commonConfiguration._html.map(conf =>
      new HtmlWebpackPlugin(Object.assign({}, conf, {
        chunks: conf.dev_chunks,
        development: true
      }))
    )
  ),
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: ['react-hot-loader/babel']
          }
        }
      },
      {
        test: /\.(c|le)ss$/,
        use: ExtractTextPlugin.extract(commonConfiguration._extractTextPluginOption)
      }
    ]
  }
})

Object.keys(configuration).map(key => key.startsWith('_') && delete configuration[key])

module.exports = configuration