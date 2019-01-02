import React from 'react'
import ReactDOM from 'react-dom'
import Social from '../components/Social'
import Button from '../components/Button'
import InputField from '../components/InputField'
import Notification from '../components/Notification'
import { validateEmail, sha512 } from '../utils/util'
import axios from 'axios'
import querystring from 'querystring'
import Log from '../../common/Log'

export default class Login extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      size: {},
      error: {
        email: false,
        password: false
      },
      notification: {
        message: this.props.notification ? this.props.notification.message : '',
        type: this.props.notification ? this.props.notification.type : '',
        showInitially: this.props.notification ? true : false,
      },
      activate: false,
      className: ['active']
    }
    this.navigate = false
  }

  componentDidMount() {
    let emailSize = window.getComputedStyle(ReactDOM.findDOMNode(this.emailSize)).getPropertyValue('content'),
        passwordSize = window.getComputedStyle(ReactDOM.findDOMNode(this.passwordSize)).getPropertyValue('content')
    this.setState({
      size: {
        email: parseInt(emailSize.substring(1, emailSize.length-1), 10),
        password: parseInt(passwordSize.substring(1, passwordSize.length-1), 10)
      }
    })
  }

  render() {
    let classNames = ['login'].concat(this.state.className).join(' '),
        style = Object.assign({ zIndex: this.props.zIndex }, this.state.style)
    return (
      <div>
        <Notification show={this.state.notification.showInitially} message={this.state.notification.message} type={this.state.notification.type} navigate={this.navigate}/>
        <div className={classNames} style={style}>
          <div className='form'>
            <input className='email' type='hidden' ref={el => this.emailSize = el} />
            <input className='password' type='hidden' ref={el => this.passwordSize = el} />
            <span className='banner'>
              Log me in with <InputField placeHolder='email address' length={40} size={this.state.size.email ? this.state.size.email : 14} ref={el => this.email = el} error={this.state.error.email} navigate={this.navigate}/>
              & &nbsp; <InputField password length={20} size={this.state.size.password ? this.state.size.password : 14} placeHolder='password' ref={el => this.password = el} error={this.state.error.password} navigate={this.navigate}/> &nbsp;
            </span>
            <div className='footer'>
              <p className='link'>
                <span className='long-text'>Forgot password ?</span>
                <span className='shorter-text'>Forgot password ?</span>
                <a onClick={this.props.onNavigateToReset}>Reset</a>
                <span className='short-text'>Password</span>
              </p>
              <Button activate={this.state.activate} navigate={this.navigate} onClick={() => {
                let error = {},
                    notification = {},
                    is_empty = false,
                    is_error = false

                Object.keys(this.state.error).forEach(key => {
                  error[key] = this[key].state.value ? false : true
                  is_empty |= error[key]
                })

                if (is_empty) {
                  notification.message = 'Please fill up all the fields.'
                  notification.type = 'warn'
                  is_error = true
                } else if (!validateEmail(this.email.state.value)) {
                  error.email = true
                  notification.message = 'Email Address is not valid.'
                  notification.type = 'error'
                  is_error = true
                }

                if (is_error) {
                  this.setState({ activate: false, error, notification })
                  return false
                }

                sha512(this.password.state.value).then(password_hash => {

                  let data = {
                    type: 'login',
                    email: this.email.state.value,
                    password: password_hash
                  }

                  /*
              	   * if the header, Content-Type: application/x-www-form-urlencoded
                   * is sent explicitly, we have to use querystring.stringify(data)
                   * otherwise, if no header is there (defaults to Content-Type: application/json)
                   * only data can be used
              	   * e.g:
                      axios.post('url', data)
                      ----------------------------------------------
                      axios.post('url', querystring.stringify(data),
                          {
                              headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                          }
                      )
              	    */
                  axios.post(
                      '/login',
                      querystring.stringify(data),
                      {
                          headers: {
                              'Content-Type': 'application/x-www-form-urlencoded'
                          },
                          timeout: 20000
                      }
                  ).then(response => {
                    let { data, ignoreStatus, ignoreStatusText } = response
                    Log.log(data, 'Login')
                    this.setState({
                      activate: true,
                      error: {
                        email: false,
                        password: false,
                      },
                      notification: {
                        message: data.message,
                        type: data.type
                      }
                    })
                    if (data['access-token'])
                      this.props.accessTokenHandler(data['access-token'])
                  }).catch(error => {
                    Log.error(error, 'Login')
                    this.setState({
                      activate: true,
                      error: {
                        email: false,
                        password: false,
                      },
                      notification: {
                        message: error.response ? error.response.data : error.message,
                        type: 'error'
                      }
                    })
                  })
                })

                return true
              }}>Login</Button>
            </div>
          </div>
          <div className='separator'></div>
          <div className='social-media'>
            <p className='link'>
              <span className='long-text'>Don't have an account ?</span>
              <span className='short-text'>New Account ?</span>
              <span className='shorter-text'>Don't have an account ?</span>
              <a onClick={this.props.onNavigateToRegister}>Sign Up</a>
            </p>
            <Social clients={['google', 'facebook', 'github', 'yahoo', 'microsoft']}/>
          </div>
        </div>
      </div>
    )
  }
}