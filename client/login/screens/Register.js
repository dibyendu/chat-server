import React from 'react'
import ReactDOM from 'react-dom'
import Button from '../components/Button'
import InputField from '../components/InputField'
import Notification from '../components/Notification'
import { validateEmail, validatePassword, sha512 } from '../utils/util'
import axios from 'axios'
import querystring from 'querystring'
import Log from '../../common/Log'


export default class Register extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      size: {},
      error: {
        fname: false,
        lname: false,
        email: false,
        password: false,
        confirm_pass: false
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
    let fnameSize = window.getComputedStyle(ReactDOM.findDOMNode(this.fnameSize)).getPropertyValue('content'),
        lnameSize = window.getComputedStyle(ReactDOM.findDOMNode(this.lnameSize)).getPropertyValue('content'),
        emailSize = window.getComputedStyle(ReactDOM.findDOMNode(this.emailSize)).getPropertyValue('content'),
        passwordSize = window.getComputedStyle(ReactDOM.findDOMNode(this.passwordSize)).getPropertyValue('content'),
        confirmPasswordSize = window.getComputedStyle(ReactDOM.findDOMNode(this.confirmPasswordSize)).getPropertyValue('content')
    this.setState({
      size: {
        fname: parseInt(fnameSize.substring(1, fnameSize.length-1), 10),
        lname: parseInt(lnameSize.substring(1, lnameSize.length-1), 10),
        email: parseInt(emailSize.substring(1, emailSize.length-1), 10),
        password: parseInt(passwordSize.substring(1, passwordSize.length-1), 10),
        confirmPassword: parseInt(confirmPasswordSize.substring(1, confirmPasswordSize.length-1), 10)
      }
    })
  }

  render() {
    let classNames = ['register'].concat(this.state.className).join(' '),
        style = Object.assign({ zIndex: this.props.zIndex }, this.state.style)
    return (
      <div>
        <Notification message={this.state.notification.message} type={this.state.notification.type} navigate={this.navigate}/>
        <div className={classNames} style={style}>
          <div className='form'>
            <input className='fname' type='hidden' ref={el => this.fnameSize = el} />
            <input className='lname' type='hidden' ref={el => this.lnameSize = el} />
            <input className='email' type='hidden' ref={el => this.emailSize = el} />
            <input className='password' type='hidden' ref={el => this.passwordSize = el} />
            <input className='confirmPassword' type='hidden' ref={el => this.confirmPasswordSize = el} />
            <span className='banner'>
              I want to register myself as <InputField placeHolder='first name' size={this.state.size.fname ? this.state.size.fname : 14} length={40} ref={el => this.fname = el} error={this.state.error.fname} navigate={this.navigate}/>
              <InputField placeHolder='last name' size={this.state.size.lname ? this.state.size.lname : 14} length={40} ref={el => this.lname = el} error={this.state.error.lname} navigate={this.navigate}/>
              with <InputField placeHolder='email address' size={this.state.size.email ? this.state.size.email : 14} length={40} ref={el => this.email = el} error={this.state.error.email} navigate={this.navigate}/>. I set my password as
              <InputField password size={this.state.size.password ? this.state.size.password : 14} length={20} placeHolder='password' ref={el => this.password = el} error={this.state.error.password} navigate={this.navigate}/> &nbsp; and confirm the same password with
              <InputField password size={this.state.size.confirmPassword ? this.state.size.confirmPassword : 14} length={20} placeHolder='password' ref={el => this.confirm_pass = el} error={this.state.error.confirm_pass} navigate={this.navigate}/> &nbsp;
            </span>
            <div className='footer'>
              <p className='link'>
                <span className='long-text'>Already have an account ?</span>
                <span className='short-text'>Account exists ?</span>
                <span className='shorter-text'>Account exists ?</span>
                <a onClick={this.props.onNavigateToLogin}>Sign In</a>
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
                } else if (this.password.state.value !== this.confirm_pass.state.value) {
                  error.confirm_pass = true
                  notification.message = 'Passwords don\'t match.'
                  notification.type = 'error'
                  is_error = true
              } else if (!validatePassword(this.password.state.value)) {
                  error.password = true
                  notification.message = 'Weak password (hint: use minimum 8 characters with 1 lowercase, 1 uppercase and 1 number)'
                  notification.type = 'warn'
                  is_error = true
                }

                if (is_error) {
                  this.setState({ activate: false, error, notification })
                  return false
                }

                setTimeout(() => {
                  grecaptcha.execute(
                    TemplateContext.recaptchaKey,
                    {action: 'register_user'}
                  ).then(token => {
                    sha512(this.password.state.value).then(password_hash => {

                      let data = {
                        type: 'register',
                        captcha: token,
                        firstName: this.fname.state.value,
                        lastName: this.lname.state.value,
                        email: this.email.state.value,
                        password: password_hash
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
                        Log.log(data, 'Register')
                        this.setState({
                          activate: true,
                          error: {
                            fname: false,
                            lname: false,
                            email: false,
                            password: false,
                            confirm_pass: false
                          },
                          notification: {
                            message: data.message,
                            type: data.type
                          }
                        })
                      }).catch(error => {
                        Log.error(error, 'Register')
                        this.setState({
                          activate: true,
                          error: {
                            fname: false,
                            lname: false,
                            email: false,
                            password: false,
                            confirm_pass: false
                          },
                          notification: {
                            message: error.response ? error.response.data : error.message,
                            type: 'error'
                          }
                        })
                      })
                    })
                  })
                }, 500)

                return true
              }}>Register</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}