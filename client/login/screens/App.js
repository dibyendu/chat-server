import React from 'react'
import EventEmitter from 'events'

import Login from './Login'
import Register from './Register'
import ResetPassword from './ResetPassword'

import audio from '../assets/transition.mp3'

const LOGIN_REDIRECTION_TIMEOUT = 4 // seconds

function accessTokenHandler(token) {
    setTimeout(() => {
        let date = new Date()
        date.setTime(date.getTime() + (100 * 365 * 24 * 3600000)) // expires after 100 years (supposed to expire NEVER)
        document.cookie = 'authorization=' + token + '; expires=' + date.toUTCString() + '; path=/'
        window.location.pathname = TemplateContext.redirect_to
    }, LOGIN_REDIRECTION_TIMEOUT * 1000)
}

export default class App extends React.Component {

  constructor(props) {
    super(props)
    if (!FontLoadStatus.loaded)
      FontLoadStatus.onFontsLoad(() => {
        this.setState({ loading: false })
      })
    this.state = {
      loading: !FontLoadStatus.loaded
    }
    this.audio = new Audio(audio)
  }


  navigate = (current, target) => {

    let currentZIndex = current.props.zIndex,
        targetZIndex = target.props.zIndex,
        body = document.getElementsByTagName('body')[0]

    let randomTransform = () => {
      let boundaries = {
        rotateX : { min : 40 , max : 90 },
        rotateY : { min : -15 , max : 45 },
        rotateZ : { min : -10 , max : 10 },
        translateX : { min : -400 , max : 400 },
        translateY : { min : -400 , max : 400 },
        translateZ : { min : 350 , max : 550 }
      }
      return {
        rx : Math.floor(Math.random() * (boundaries.rotateX.max - boundaries.rotateX.min + 1) + boundaries.rotateX.min),
        ry : Math.floor(Math.random() * (boundaries.rotateY.max - boundaries.rotateY.min + 1) + boundaries.rotateY.min),
        rz : Math.floor(Math.random() * (boundaries.rotateZ.max - boundaries.rotateZ.min + 1) + boundaries.rotateZ.min),
        tx : Math.floor(Math.random() * (boundaries.translateX.max - boundaries.translateX.min + 1) + boundaries.translateX.min),
        ty : Math.floor(Math.random() * (boundaries.translateY.max - boundaries.translateY.min + 1) + boundaries.translateY.min),
        tz : Math.floor(Math.random() * (boundaries.translateZ.max - boundaries.translateZ.min + 1) + boundaries.translateZ.min)
      }
    }

    let animate = (elem, opacity, rotationZ) => {
      let vector = randomTransform()
      let style = {
        opacity,
        transform: opacity === 1
                  ? `translateX(0) translateY(0) translateZ(0) rotateX(0) rotateY(0) rotateZ(${rotationZ})`
                  : `translateX(${vector.tx}px) translateY(${vector.ty}px) translateZ(${vector.tz}px) rotateX(${vector.rx}deg) rotateY(${vector.ry}deg) rotateZ(${vector.rz}deg)`
      }
      elem.setState({ className: ['animating'], style })
      this.audio.play()
      setTimeout(() => elem.props.navigationEventEmitter.emit('navigationEndEvent', elem), 1000)
    }

    current.navigate = true
    target.navigate = true
    current.setState({ className: [] }) // removing class 'active'
    body.classList.toggle('no-scroll')
    if (currentZIndex > targetZIndex) {
      current.props.navigationEventEmitter.once('navigationEndEvent', _ => {
        current.setState({ className: ['hidden'] })
        current.navigate = false
        if (currentZIndex - targetZIndex > 1) {
          let elem = [this.login, this.register, this.reset].filter(el => el.props.zIndex === currentZIndex - 1)[0]
          elem.props.navigationEventEmitter.once('navigationEndEvent', elem => {
            elem.setState({ className: ['hidden'] })
            target.setState({ className: ['active'] })
            elem.navigate = false
            target.navigate = false
            body.classList.toggle('no-scroll')
          })
          elem.navigate = true
          animate(elem, 0, 0)
        } else {
          target.setState({ className: ['active'] })
          target.navigate = false
          body.classList.toggle('no-scroll')
        }
      })
      animate(current, 0, 0)
      target.setState({ className: ['active', 'animating'] })
    } else {
      let elem = [this.login, this.register, this.reset].filter(el => el.props.zIndex == currentZIndex + 1)[0]
      elem.props.navigationEventEmitter.once('navigationEndEvent', elem => {
        elem.setState({ className: [] }) // removing class 'animating'
        current.setState({ className: [] }) // removing class 'animating'
        current.navigate = false
        if (targetZIndex - currentZIndex > 1) {
          target.props.navigationEventEmitter.once('navigationEndEvent', _ => {
            target.setState({ className: ['active'] })
            target.navigate = false
            elem.navigate = false
            body.classList.toggle('no-scroll')
          })
          target.setState({ className: [] }) // removing class 'hidden'
          setTimeout(() => animate(target, 1, 0), 40)
        } else {
          elem.setState({ className: ['active'] })
          elem.navigate = false
          body.classList.toggle('no-scroll')
        }
      })
      elem.navigate = true
      elem.setState({ className: [] }) // removing class 'hidden'
      current.setState({ className: ['animating'] })
      setTimeout(() => animate(elem, 1, targetZIndex - currentZIndex > 1 ? '3deg' : 0), 40)
    }
  }

  render() {

    if (this.state.loading)
      return null

    if (TemplateContext.access_token)
      accessTokenHandler(TemplateContext.access_token)

    return (
      <div className='container'>
        <Login
          ref = {el => this.login = el}
          zIndex = {2}
          onNavigateToRegister = {() => this.navigate(this.login, this.register)}
          onNavigateToReset = {() => this.navigate(this.login, this.reset)}
          navigationEventEmitter = {new EventEmitter()}
          notification = {TemplateContext.notification ? TemplateContext.notification : undefined}
          accessTokenHandler = {token => accessTokenHandler(token)}
        />
        <Register
          ref = {el => this.register = el}
          zIndex = {1}
          onNavigateToLogin = {() => this.navigate(this.register, this.login)}
          navigationEventEmitter = {new EventEmitter()}
        />
        <ResetPassword
          ref = {el => this.reset = el}
          zIndex = {0}
          onNavigateToLogin = {() => this.navigate(this.reset, this.login)}
          navigationEventEmitter = {new EventEmitter()}
        />
      </div>
    )
  }
}
