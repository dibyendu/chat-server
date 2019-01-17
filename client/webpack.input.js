const REACT_CDN = [
  {
    module: 'react',
    global: 'React',
    default_cdn_path: 'umd/react.production.min.js'
  },
  // react-dom is placed after react as it depends on react
  {
    module: 'react-dom',
    global: 'ReactDOM',
    default_cdn_path: 'umd/react-dom.production.min.js'
  }
]

module.exports = {
  js_css: {
    login: [
      './login/index.jsx',
      './login/index.less'
      // more js/css files could be added to the list
    ],
    password_reset: [
      './login/password-reset/password-reset.jsx',
      './login/password-reset/password-reset.less'
    ],
    chat: [
      './chat/index.jsx',
      './chat/index.less'
    ]
  },
  /*
    Get the required chunk names from webpack output and enter for dev_chunks or prod_chunks manually. 😫
    For prod_chunks, chunk numbers in webpack output will give us the order of insertion in the prod_chunks list.

    The cdn option is used in production mode to deliver the asset from a CDN.
    Each html file has to have its own cdn field (even if it's repeated for more than one html files 🧐).
    Modules specified inside AT LEAST ONE of the cdn sections are NOT bundled in prodution. 🤔

    CDN uri's are added in the same order they are mentioned inside the cdn section. ⚠️

    cdn: {
      module:             Name of the npm module
      global:             Global variable exported from the module
      primary_cdn_uri:    Absolute uri of the 3rd party (other than unpkg/jsDelivr) CDN provider.
                          Use ${version} as a placeholder for using the latest version of the module.
                          E.g: '//some.cdn.com/module/${version}/file.min.js'
      default_cdn_path:   Will only be used if primary_cdn_uri is NOT there, otherwise field could be ignored.
                          Files will be delivered from unpkg/jsDelivr.
                          E.g: ['some/path/file.min.js'] will be converted to either
                          '//unpkg.com/module@version/some/path/file.min.js' or
                          '//cdn.jsdelivr.net/npm/module@version/some/path/file.min.js'
      is_css:             Set to false or omit the field if it is a JS module.
                          If true the module, global and css fields are ignored.
      css:                List of CSS files associated with this (JS) module.
                          Could be omitted or empty list if primary_cdn_uri is set.
                          It has to be a list of absolute uri's
                          or a list of file_paths (like default_cdn_path) from unpkg.com
      append:             Set to false or omit the field to prepend the CDN uri before the bundled JS/CSS
    }

    'output_dir' MUST be used if 'input_file' contains regular expressions, 'output_file' has to be used otherwise.
    'output_dir' can be a string representing any valid path (like 'path/to/the/dir' or '.') but can not be an empty string.
  */
  html: [
    {
      input_file: 'common/*.html',
      output_dir: 'common',
      dev_chunks: [],
      prod_chunks: [],
      cdn: []
    },
    {
      input_file: 'static_pages/*.htm',
      output_dir: 'static_pages',
      dev_chunks: [],
      prod_chunks: [],
      cdn: []
    },
    {
      input_file: 'email_templates/*.email',
      output_dir: 'email_templates',
      dev_chunks: [],
      prod_chunks: [],
      cdn: []
    },
    {
      input_file: 'login/index.html',
      output_file: 'login.html',
      chunksSortMode: 'dependency',
      dev_chunks: ['login'],
      prod_chunks: ['login~password_reset', 'login'],
      cdn: [
        {
          module: 'zxcvbn',
          global: 'zxcvbn',
          default_cdn_path: 'dist/zxcvbn.js'
        },
        {
          module: 'axios',
          global: 'axios',
          default_cdn_path: 'dist/axios.min.js'
        },
        ...REACT_CDN
      ]
    },
    {
      input_file: 'login/password-reset/password-reset.html',
      output_file: 'password-reset.html',
      chunksSortMode: 'dependency',
      dev_chunks: ['password_reset'],
      prod_chunks: ['login~password_reset', 'password_reset'],
      cdn: [
        {
          module: 'zxcvbn',
          global: 'zxcvbn',
          default_cdn_path: 'dist/zxcvbn.js'
        },
        {
          module: 'axios',
          global: 'axios',
          default_cdn_path: 'dist/axios.min.js'
        },
        ...REACT_CDN
      ]
    },
    {
      input_file: 'chat/index.html',
      output_file: 'chat.html',
      chunksSortMode: 'dependency',
      dev_chunks: ['chat'],
      prod_chunks: ['chat'],
      cdn: [
        {
          module: 'roughjs',
          global: 'rough',
          default_cdn_path: 'dist/rough.min.js'
        },
        ...REACT_CDN
      ]
    }
  ]
}