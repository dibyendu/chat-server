/* dev-block:start */
import debug from 'debug'

class Logger {

  constructor(app_name) {
    this.app_name = app_name
    this.colors = {
      log: '#2196F3',
      info: '#0000FF',
      warn: '#735B12',
      error: '#ED3833'
    }
    localStorage.setItem('debug', `${this.app_name}:*`)
  }

  generateMessage(level, message, source) {
    let logger = debug(`${this.app_name}:${level}`)
    logger.color = this.colors[level]
    logger(source ? `[${source}]` : '', message)
  }

  log(message, source) {
    this.generateMessage('log', message, source)
  }

  info(message, source) {
    this.generateMessage('info', message, source)
  }

  warn(message, source) {
    this.generateMessage('warn', message, source)
  }

  error(message, source) {
    this.generateMessage('error', message, source)
  }
}
/* dev-block:end */

var Log = {
  log: (message, source) => {
    console.log(source ? `[${source}] ` : '', message)
  },
  info: (message, source) => {
    console.info(source ? `[${source}] ` : '', message)
  },
  warn: (message, source) => {
    console.warn(source ? `[${source}] ` : '', message)
  },
  error: (message, source) => {
    console.error(source ? `[${source}] ` : '', message)
  }
}

/* dev-block:start */
Log = new Logger('Chat-App')
/* dev-block:end */

export default Log