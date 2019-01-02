import React from 'react';
import { animatePath } from '../utils/util'

export default class Button extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      button: {
        width: 0,
        height: 0
      },
      isPressed: false
    }
    this.buttonAnimationDuration = 1000
  }

  componentDidMount() {
    let width = this.button.clientWidth,
        height = this.button.clientHeight
    this.setState({ button: { width, height } })
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.navigate && this.state.isPressed && nextProps.activate) {
      let width = this.button.clientWidth,
          height = this.button.clientHeight
      this.setState({ button: { width, height }, isPressed: false })
      animatePath(this.buttonBorder, -1, 0, this.buttonAnimationDuration)
      animatePath(this.buttonBG, -1, 0, this.buttonAnimationDuration)
    }
  }

  render() {
    return (
      <div
        className={`button${this.state.isPressed ? ' clicked' : ''}`}
        ref={el => this.button = el}
        onClick={() => {
          if (this.state.isPressed)
            return
          if (this.props.onClick()) {
            this.setState({ isPressed: true })
            animatePath(this.buttonBG, 0, -1, this.buttonAnimationDuration)
            animatePath(this.buttonBorder, 0, -1, this.buttonAnimationDuration, () => {
              this.setState({ button: {width: 0, height: 0} })
            })
          }
        }}
      >
        <svg
          height={this.state.button.height}
          width={this.state.button.width}
          preserveAspectRatio='none'
          viewBox='0 0 9.4 5.35'
        >
          <path
            d='M 0.59977808,1.2462552 0.78297424,4.4276042 2.6802958,0.25350418 2.1669029,4.6731042 3.6401172,0.47670418 3.2829743,4.6509042 5.0910101,0.74460418 4.6222601,4.9633042 6.5642243,0.47660418 5.6490458,4.9409042 l 1.9866071,-3.8168 -0.6919643,3.9061 1.7857143,-2.8348 0.077865,2.7442212'
            fill='none'
            stroke='#F1F165'
            strokeWidth={1.2}
            strokeLinecap='butt'
            strokeLinejoin='bevel'
            strokeMiterlimit={4}
            strokeDasharray='0 0'
            ref={el => this.buttonBG = el}
          />
        </svg>
        <svg
          height={this.state.button.height}
          width={this.state.button.width}
          preserveAspectRatio='none'
          viewBox='0 0 5.16 2.5'
        >
          <path
            d='M 0.05018501,0.33210771 C 0.20474224,0.91923279 -0.0295279,1.9422805 0.08555881,2.2550005 0.41944157,2.2151715 3.3992266,2.1154321 4.9403282,2.254488 4.9973773,1.3820141 4.6804507,-0.27121692 5.0096037,0.10535414 5.1779348,0.41148807 1.5998394,0.0346845 0.06309578,0.14529164'
            fill='none'
            stroke='#000'
            strokeWidth={0.06}
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeMiterlimit={4}
            strokeDasharray='0 0'
            ref={el => this.buttonBorder = el}
          />
        </svg>
        <span>{this.props.children}</span>
      </div>
    )
  }
}
