import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

/* dev-block:start */
import { AppContainer } from 'react-hot-loader'
const devRender = () => { ReactDOM.render(<AppContainer><App/></AppContainer>, document.getElementById('app')) }
/* dev-block:end */

const prodRender = () => { ReactDOM.render(<App/>, document.getElementById('app')) }
var render = prodRender

/* dev-block:start */
render = devRender
/* dev-block:end */

render()

/* dev-block:start */
if (module.hot) {
  module.hot.accept('./App', devRender)
}
/* dev-block:end */
