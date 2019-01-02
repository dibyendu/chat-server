const merge = require('webpack-merge'),
ExtractTextPlugin = require('extract-text-webpack-plugin'),
OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin'),
HtmlWebpackPlugin = require('html-webpack-plugin'),
commonConfiguration = require('./webpack.common.js'),
ReplaceModuleByCDN = require('./webpack-html-cdn-plugin'),
UglifyES = require('uglify-es')

let externals = {}

if (commonConfiguration._html) {
  for (let i = 0; i < commonConfiguration._html.length; i++) {
    let conf = commonConfiguration._html[i]
    if (conf.cdn && conf.cdn.length > 0) {
      for (let j = 0; j < conf.cdn.length; j++) {
        let cdn = conf.cdn[j]
        if (!cdn.is_css) {
          externals[cdn.module] = cdn.global
        }
      }
    }
  }
}

let configuration = merge.smart(commonConfiguration, {
  mode: 'production',
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
  externals,
  plugins: [
    new OptimizeCssAssetsPlugin()
  ].concat(
    commonConfiguration._html
    ?
    commonConfiguration._html.map(conf =>
      new HtmlWebpackPlugin(Object.assign({}, conf, {
        chunks: conf.prod_chunks,
        minify: {
          /*
            Use this function until the following issues is fixed.
            https://github.com/kangax/html-minifier/issues/843
            Once fixed, we don't need to import uglify-es module and use this function anymore. 🙂
            minifyJS: true        will work then.
          */
          minifyJS: (text, inline) => {
            if (text) {
              if (/\/\/[\ \t]*\[skip\-minify\].*/i.exec(text.trimLeft()) != null)
                return text
              let result = UglifyES.minify(text)
              if (result.error)
                throw new Error(
                  `${result.error.message}
                  in HTML template '${conf.template}' at position ${result.error.line}:${result.error.col}
                  inside ${inline ? 'an inline javascript' : 'a <script> tag'}.`
                )
              text = result.code
            }
            return text
          },
          minifyCSS: true,
          quoteCharacter: '\'',
          removeComments: true,
          collapseWhitespace: true,
          preserveLineBreaks: false
        }
      }))
    )
    :
    []
  ).concat([
    new ReplaceModuleByCDN()
  ]),
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: [
                [
                  'transform-remove-console',
                  {
                    exclude: ['error', 'warn']
                  }
                ]
              ]
            }
          },
          {
            loader: 'webpack-strip-block',
            options: {
              start: 'dev-block:start',
              end: 'dev-block:end'
            }
          }
        ]
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