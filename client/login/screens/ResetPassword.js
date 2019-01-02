import React from 'react'
import ReactDOM from 'react-dom'
import Button from '../components/Button'
import InputField from '../components/InputField'
import Notification from '../components/Notification'
import { validateEmail } from '../utils/util'
import axios from 'axios'
import querystring from 'querystring'
import Log from '../../common/Log'


export default class ResetPassword extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      size: {},
      error: {
        email: false
      },
      notification: {
        message: '',
        type: ''
      },
      activate: false
    }
    this.navigate = false
  }

  componentDidMount() {
    let emailSize = window.getComputedStyle(ReactDOM.findDOMNode(this.emailSize)).getPropertyValue('content')
    this.setState({
      size: {
        email: parseInt(emailSize.substring(1, emailSize.length-1), 10)
      }
    })
  }

  render() {
    let classNames = ['reset-pass'].concat(this.state.className).join(' '),
        style = Object.assign({ zIndex: this.props.zIndex }, this.state.style)
    return (
      <div>
        <Notification message={this.state.notification.message} type={this.state.notification.type} navigate={this.navigate}/>
        <div className={classNames} style={style}>
          <div className='form'>
            <input className='email' type='hidden' ref={el => this.emailSize = el} />
            <span className='banner'>
              I forgot my password. Please send a password reset link to <InputField placeHolder='email address' size={this.state.size.email ? this.state.size.email : 14} length={40} ref={el => this.email = el} error={this.state.error.email} navigate={this.navigate}/>
            </span>
            <div className='footer'>
              <p className='link'>
                <span className='long-text'>Changed password ?</span>
                <span className='short-text'>Changed password ?</span>
                <span className='shorter-text'>Changed ?</span>
                <a onClick={this.props.onNavigateToLogin}>Sign In</a>
              </p>
              <Button activate={this.state.activate} navigate={this.navigate} onClick={() => {

                let notification = {},
                    is_error = false

                if (!this.email.state.value) {
                  notification.message = 'Please fill up the email field.'
                  notification.type = 'warn'
                  is_error = true
                } else if (!validateEmail(this.email.state.value)) {
                  notification.message = 'Email Address is not valid.'
                  notification.type = 'error'
                  is_error = true
                }

                if (is_error) {
                  this.setState({ activate: false, error: { email: true }, notification })
                  return false
                }

                setTimeout(() => {
                  grecaptcha.execute(
                    TemplateContext.recaptchaKey,
                    {action: 'reset_password'}
                  ).then(token => {

                    let data = {
                      type: 'reset',
                      captcha: token,
                      email: this.email.state.value,
                    }

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
                      let { data, _, __ } = response
                      Log.log(data, 'Reset Password')
                      this.setState({
                        activate: true,
                        error: {
                          email: false
                        },
                        notification: {
                          message: data.message,
                          type: data.type
                        }
                      })
                    }).catch(error => {
                      Log.error(error, 'Reset Password')
                      this.setState({
                        activate: true,
                        error: {
                          email: false
                        },
                        notification: {
                          message: error.response ? error.response.data : error.message,
                          type: 'error'
                        }
                      })
                    })
                  })
                }, 500)

                return true
              }}>Submit</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}