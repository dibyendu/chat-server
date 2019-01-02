import React from 'react'
import ReactDOM from 'react-dom'
import Button from '../components/Button'
import InputField from '../components/InputField'
import Notification from '../components/Notification'
import { validatePassword, sha512 } from '../utils/util'
import axios from 'axios'
import querystring from 'querystring'
import Log from '../../common/Log'

class ResetPassword extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      size: {},
      error: {
        password: false,
        confirm_pass: false
      },
      notification: {
        message: '',
        type: ''
      },
      activate: false
    }
  }

  componentDidMount() {
    let passwordSize = window.getComputedStyle(ReactDOM.findDOMNode(this.passwordSize)).getPropertyValue('content')
    this.setState({
      size: {
        password: parseInt(passwordSize.substring(1, passwordSize.length-1))
      }
    })
  }

  render() {
    return (
      <div>
        <Notification message={this.state.notification.message} type={this.state.notification.type} navigate={this.navigate}/>
        <div className='reset-pass'>
          <div className='form'>
            <input className='reset-password' type='hidden' ref={el => this.passwordSize = el} />
            <span className='banner'>
              I set my new password as &nbsp;
              <InputField password length={20} size={this.state.size.password ? this.state.size.password : 14} placeHolder='new password' ref={el => this.password = el} error={this.state.error.password}/>
              &nbsp; and confirm it with <InputField password length={20} size={this.state.size.password ? this.state.size.password : 14} placeHolder='same password' ref={el => this.confirm_pass = el} error={this.state.error.confirm_pass}/> &nbsp;
            </span>
            <div className='footer'>
              <Button activate={this.state.activate} onClick={() => {

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

                sha512(this.password.state.value).then(password_hash => {

                  let data = {
                    password: password_hash
                  }

                  axios.post(
                    '',
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
                        password: false,
                        confirm_pass: false
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

                return true
              }}>Submit</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
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
  }

  render() {

    if (this.state.loading)
      return null

    return (
      <div className='container'>
        <ResetPassword/>
      </div>
    )
  }
}