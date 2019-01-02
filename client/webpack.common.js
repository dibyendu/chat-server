const path = require('path'),
glob = require('glob'),
ExtractTextPlugin = require('extract-text-webpack-plugin'),
LessPluginAutoPrefix = require('less-plugin-autoprefix'),
LessPluginGroupCssMediaQueries = require('less-plugin-group-css-media-queries'),
entryPoint = require('./webpack.input.js')


let _html = []
entryPoint.html.forEach(html => {
  let files = glob.sync(html.input_file)
  if (!files.length) {
    console.error(`\x1b[31mERROR:\x1b[0m No file found for \x1b[33m${html.template}\x1b[0m in the \x1b[33mhtml\x1b[0m section of webpack input\n`)
    process.exit(1)
  }
  let is_output_dir = html.output_dir ? true : false,
  output_path = html.output_dir ? html.output_dir : html.output_file
  delete html.input_file
  delete html.output_dir
  delete html.output_file
  files.forEach(file => _html.push({
    template: file,
    filename: is_output_dir ? `${output_path}/${file.split('/').pop()}` : output_path,
    ...html
  }))
})

module.exports = {
  entry: entryPoint.js_css,
  output: {
    path: path.resolve('bundle'),
    publicPath: '/bundle/',
    filename: '[name].[chunkhash:16].js'
  },
  _html,
  plugins: [
    new ExtractTextPlugin({
      publicPath: '/bundle/',
      filename: '[name].[md5:contenthash:hex:16].css'
    })
  ],
  _extractTextPluginOption: {
    fallback: 'style-loader',
    use: [
      {
        loader: 'css-loader'
      },
      {
        loader: 'less-loader',
        options: {
          plugins: [
            new LessPluginAutoPrefix({ browsers: ['last 20 versions', '> 0.001%'] }),
            LessPluginGroupCssMediaQueries
          ]
        }
      }
    ]
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/react'],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              '@babel/plugin-syntax-import-meta',
              ['@babel/plugin-proposal-class-properties', {'loose': false}],
              '@babel/plugin-proposal-json-strings',
              '@babel/plugin-proposal-object-rest-spread'
            ]
          }
        }
      },
      {
        test: /\.(jpe?g|png|gif|ico|svg|webp|mp3|mp4|woff2?|eot|ttf)(\?[a-z0-9=.]+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              publicPath: '/bundle/',
              name: '[md5:hash:base64:16].[ext]'
            }
          }
        ]
      }
    ]
  }
}
