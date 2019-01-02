const packages = require('./package-lock.json')

module.exports = class ReplaceModuleByCDN {

  getCDN(name, path) {
    return `//cdn.jsdelivr.net/npm/${name}@${packages.dependencies[name].version}/${path}`
    //     `//unpkg.com/${name}@${packages.dependencies[name].version}/${path}`
  }

  filterCSS(module) {
    let version = packages.dependencies[module.module].version
    return module.is_css === true
    ?
    module.primary_cdn_uri ? [module.primary_cdn_uri.replace('${version}', version)] : [this.getCDN(module.module, module.default_cdn_path)]
    :
    (
      module.css && module.css.length > 0
      ?
      module.css.map(css => module.primary_cdn_uri ? css : this.getCDN(module.module, css))
      :
      []
    )
  }

  filterJS(module) {
    let version = module.module ? (packages.dependencies[module.module] ? packages.dependencies[module.module].version : null) : null
    return module.is_css === true ? [] : module.primary_cdn_uri ? [module.primary_cdn_uri.replace('${version}', version)] : [this.getCDN(module.module, module.default_cdn_path)]
  }

  apply(compiler) {

    compiler.hooks.compilation.tap('ReplaceModuleByCDN', (compilation) => {
      compilation.hooks.htmlWebpackPluginAlterAssetTags.tapAsync('ReplaceModuleByCDN', (data, next) => {

        if (!data.plugin.options.cdn)
        return next(null, data)

        let cdn = data.plugin.options.cdn,
        prepend_assets = cdn.filter(module => module.append !== true),
        append_assets = cdn.filter(module => module.append === true),
        prepend_css = [].concat.apply([], prepend_assets.map(module => this.filterCSS(module))),
        prepend_js = [].concat.apply([], prepend_assets.map(module => this.filterJS(module))),
        append_css = [].concat.apply([], append_assets.map(module => this.filterCSS(module))),
        append_js = [].concat.apply([], append_assets.map(module => this.filterJS(module)))

        data.head = prepend_css.map(link => ({
          tagName: 'link',
          attributes: {
            href: link,
            rel: 'stylesheet'
          }
        })).concat(data.head).concat(append_css.map(link => ({
          tagName: 'link',
          attributes: {
            href: link,
            rel: 'stylesheet'
          }
        })))
        data.body = prepend_js.map(link => ({
          tagName: 'script',
          closeTag: true,
          attributes: {
            crossorigin: 'anonymous',
            type: 'text/javascript',
            src: link
          }
        })).concat(data.body).concat(append_js.map(link => ({
          tagName: 'script',
          closeTag: true,
          attributes: {
            crossorigin: 'anonymous',
            type: 'text/javascript',
            src: link
          }
        })))

        next(null, data)
      })
    })
  }
}