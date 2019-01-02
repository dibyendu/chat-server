import React from 'react'
import ReactDOM from 'react-dom'
import zxcvbn from 'zxcvbn'
import { animatePath } from '../utils/util'

export default class InputField extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      placeholderStyle: {},
      bottomLine: {
        top: 0,
        left: 0,
        width: 0,
        height: 0
      },
      errorMark: {
        top: 0,
        left: 0,
        width: 0,
        height: 0
      },
      eye: {
        top: 0,
        right: 0,
        width: 0,
        watch: false
      },
      animationStartTime: null,
      isFocused: false,
      value: this.props.value,
      passwordStrength: -1
    }
    this.bottomLineAnimationDuration = 400
    this.errorMarkAnimationDuration = 1000
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.navigate && ((!this.props.error && nextProps.error) ||
        (this.state.errorMark.width === 0 && this.props.error && nextProps.error))) {
      let width = this.input.clientWidth,
          height = this.input.clientHeight,
          top = this.input.offsetTop,
          left = this.input.offsetLeft
      this.setState({ errorMark: {top, left, width, height} })
      animatePath(this.errorMark, -1, 0, this.errorMarkAnimationDuration)
    }
  }

  componentDidMount() {
    let height = this.input.clientHeight,
        top = this.input.offsetTop,
        fontSize = window.getComputedStyle(ReactDOM.findDOMNode(this.hidden)).getPropertyValue('content')
    this.placeHolderInitialFontSize = parseInt(fontSize.substring(1, fontSize.length-1))
    let newState = {
      placeholderStyle: {
        top: !this.props.value
              ? top + height / 2  - this.label.clientHeight / 2
              : top  - this.label.clientHeight,
        fontSize: !this.props.value ? this.placeHolderInitialFontSize : this.placeHolderInitialFontSize / 2
      }
    }
    if (this.props.password) {
      newState.eye = {
          top: top + height / 4,
          right: - height / 2,
          width: height / 2,
          watch: this.state.eye.watch
        }
    }
    this.setState(newState)
  }

  render() {
    return (
      <div className='input-field'>
        <input className='hidden' type='hidden' ref={el => this.hidden = el} />
        <input
          className='visible'
          autoComplete='off'
          type={ this.props.password && !this.state.eye.watch ? 'password' : 'text' }
          spellCheck='false'
          size={ this.props.size }
          maxLength={ this.props.length ? this.props.length : 20 }
          ref={el => this.input = el}
          value={this.state.value}
          onChange={({ target: { value }}) => {
            this.setState(prevState => ({
              ...prevState,
              passwordStrength: value ? zxcvbn(value).score : -1,
              value
            }))
          }}
          onFocus={event => {
            this.setState(prevState => ({
              ...prevState,
              placeholderStyle: {
                top: this.input.offsetTop  - this.label.clientHeight,
                fontSize: this.placeHolderInitialFontSize / 2
              },
              bottomLine: {
                height: 1,
                width: this.input.clientWidth,
                left: this.input.offsetLeft,
                top: this.input.offsetTop + this.input.clientHeight
              },
              animationStartTime: new Date().getTime(),
              isFocused: true
            }))
            animatePath(this.bottomLine, -1, 0, this.bottomLineAnimationDuration)
            let value = event.target.value
            event.target.value = ''
            event.target.value = value
          }}
          onBlur={() => {
            if (!this.state.isFocused)
              return
            let animDuration = new Date().getTime() - this.state.animationStartTime,
                length = this.bottomLine.getTotalLength(),
                currentLength = animDuration * length / this.bottomLineAnimationDuration,
                resetState = {
                  isFocused: false,
                  animationStartTime: null,
                  bottomLine: {
                    height: 0,
                    width: 0,
                    left: 0,
                    top: 0
                  }
                }
            animatePath(
              this.bottomLine,
              animDuration < this.bottomLineAnimationDuration ? length - currentLength : 0,
              - 1,
              animDuration < this.bottomLineAnimationDuration ? animDuration : this.bottomLineAnimationDuration
            )
            setTimeout(
              () => this.setState(resetState),
              (animDuration < this.bottomLineAnimationDuration ? animDuration : this.bottomLineAnimationDuration) + 200
            )

            if (!this.state.value) {
              this.setState({
                placeholderStyle: {
                  top: this.input.offsetTop + this.input.clientHeight / 2  - this.label.clientHeight / 2,
                  fontSize: this.placeHolderInitialFontSize
                }
              })
            }
          }}
        />
        <span
          className='label'
          style={this.state.placeholderStyle}
          ref={el => this.label = el}
          onMouseDown={event => {
            event.preventDefault()
            this.input.focus()
          }}
        >
          {!this.state.value ? this.props.placeHolder : <span>&nbsp;</span>}
        </span>
        <div className='password-strength-meter' style={{visibility: this.props.password && this.state.isFocused ? 'visible' : 'hidden'}}>
          <div className='part' style={{
            background: this.state.passwordStrength < 0 ? 'transparent' : this.state.passwordStrength <= 2 ? '#FF4B47' : this.state.passwordStrength === 3 ? '#F9AE35' : '#2DAF7D'
          }}></div>
          <div className='part' style={{
            background: this.state.passwordStrength === 3 ? '#F9AE35' : this.state.passwordStrength === 4 ? '#2DAF7D' : 'transparent'
          }}></div>
          <div className='part' style={{
            background: this.state.passwordStrength === 4 ? '#2DAF7D' : 'transparent'
          }}></div>
        </div>
        <span className='password-strength-info' style={{visibility: this.props.password && this.state.isFocused ? 'visible' : 'hidden'}}>
          {this.state.passwordStrength < 0 ? '' : this.state.passwordStrength <= 1 ? 'very weak' : this.state.passwordStrength === 2 ? 'weak' : this.state.passwordStrength === 3 ? 'good' : 'strong'}
        </span>
        <svg
          height={this.state.bottomLine.height}
          width={this.state.bottomLine.width}
          style={{
            left: this.state.bottomLine.left,
            top: this.state.bottomLine.top
          }}
          preserveAspectRatio='xMidYMid slice'
          viewBox='0 0 8 1'
        >
          <path
            d='M0 0.5L1 0.5L2 0.5L3 0.5L4 0.5L5 0.5L6 0.5L7 0.5L8 0.5'
            fill='none'
            stroke='#000'
            strokeWidth='0.1'
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeDasharray='0 0'
            ref={el => this.bottomLine = el}
          />
        </svg>
        <svg
          height={this.state.errorMark.height}
          width={this.state.errorMark.width}
          style={{
            left: this.state.errorMark.left,
            top: this.state.errorMark.top
          }}
          preserveAspectRatio='none'
          viewBox='0 0 154 48'
          onMouseDown={event => {
            event.preventDefault()
            animatePath(this.errorMark, 0, -1, this.errorMarkAnimationDuration)
            setTimeout(() => {
              this.setState({
                errorMark: {
                  top: 0,
                  left: 0,
                  width: 0,
                  height: 0
                }
              })
              this.input.focus()
            }, this.errorMarkAnimationDuration + 200)
          }}
        >
          <path
            d='M152.94 0.72C150.37 1.17 148.77 1.45 148.13 1.57C145.63 2.01 143.17 2.64 140.77 3.45C139.92 3.74 139.02 4.04 137.69 4.5C137.69 4.5 135.35 5.29 135.35 5.29C134.4 5.61 132.04 6.41 128.26 7.7L120.31 10.21L112.57 13.14L103.56 16.35L88.53 22.31L75.76 27.36L65.24 31.03L56.23 34.24L43.46 37.91L32.94 41.12L20.17 43.87C17.13 44.38 15.23 44.69 14.47 44.82C12.77 45.1 11.04 45.2 9.31 45.12C8.03 45.05 7.75 45.04 6.71 44.98C4.37 44.86 2.29 43.44 1.33 41.3C1.19 40.98 1.68 42.08 1.38 41.4C0.89 40.31 0.65 39.12 0.68 37.92C0.69 37.33 0.7 37.09 0.71 36.43C0.73 35.44 0.96 34.47 1.37 33.57C1.74 32.77 2.21 31.76 2.57 30.96C2.57 30.96 4.05 28.28 4.05 28.28C4.68 27.3 5.39 26.2 5.94 25.35C6.79 24.03 7.74 22.77 8.78 21.58C9.51 20.74 9.26 21.02 9.78 20.44C11.54 18.42 13.73 16.81 16.19 15.73C17.37 15.21 17.52 15.15 18.79 14.59C21 13.62 23.29 12.84 25.63 12.27C27.44 11.83 29.95 11.21 31.91 10.73C31.91 10.73 37.49 9.71 37.49 9.71C38.66 9.57 40.19 9.38 41.56 9.21C41.56 9.21 45.07 9 45.07 9C46.17 9 47.4 9 48.42 9C49.82 9 51.23 9.13 52.61 9.39C54.12 9.68 53.85 9.63 54.68 9.79C58.32 10.48 61.84 11.65 65.16 13.28C65.92 13.66 67.83 14.6 70.89 16.1L80.01 21L90.74 28.26L98.66 33.67L105.88 37.94L111.82 41.12L119.33 44.26L132.1 47.08L140.58 47.36'
            fill='none'
            stroke='#f00'
            strokeWidth='1'
            strokeLinecap='round'
            strokeLinejoin='miter'
            strokeMiterlimit='4'
            strokeDasharray='0 0'
            ref={el => this.errorMark = el}
          />
        </svg>
        <div title={ this.state.eye.watch ? 'hide password' : 'show password' }>
          <svg
            className='eye'
            height={this.state.eye.width}
            width={this.state.eye.width}
            style={{
              top: this.state.eye.top,
              right: this.state.eye.right,
              visibility: this.state.value ? 'visible' : 'hidden'
            }}
            preserveAspectRatio='none'
            viewBox='0 0 16 16'
            onMouseDown={event => {
              event.preventDefault()
              this.setState(prevState => ({ eye: { ...prevState.eye, watch: !prevState.eye.watch } }))
            }}
          >
            <path
              d='M8.06 2C3 2 0 8 0 8s3 6 8.06 6C13 14 16 8 16 8s-3-6-7.94-6zM8 12c-2.2 0-4-1.78-4-4 0-2.2 1.8-4 4-4 2.22 0 4 1.8 4 4 0 2.22-1.78 4-4 4zm2-4c0 1.11-.89 2-2 2-1.11 0-2-.89-2-2 0-1.11.89-2 2-2 1.11 0 2 .89 2 2z'
              fillRule='evenodd'
              fill='#888'
            />
            <path
              d='M0 14L16 2'
              fill='none'
              stroke='#888'
              strokeWidth={ !this.state.eye.watch ? 0 : 1 }
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </div>
      </div>
    )
  }
}
