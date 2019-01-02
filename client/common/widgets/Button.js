import React from 'react'
import rough from 'roughjs'
import PropTypes from 'prop-types'

export default class Button extends React.Component {

  constructor(props) {
    super(props)
  }

  componentDidMount() {
    let gutter = 2
    rough.canvas(this.border).rectangle(gutter, gutter, this.props.width - 2 * gutter, this.props.height - 2 * gutter, {
      fill: this.props.disabled ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 0, 0.5)',
      fillWeight: 2,
      fillStyle: this.props.disabled ? 'cross-hatch' : 'zigzag',
      hachureAngle: 60,
      hachureGap: this.props.disabled ? 6 : 5,
      roughness: 2
    })
  }

  render() {
    return (
      <div
        className='button'
        style={Object.assign({
          width: this.props.width,
          height: this.props.height,
          fontSize: this.props.fontSize,
          pointerEvents: this.props.disabled ? 'none' : 'all'
        }, this.props.style)}
        onClick={this.props.onClick}>
        <canvas
          ref={el => this.border = el}
          width={this.props.width}
          height={this.props.height}/>
        <span style={{width: this.props.width, lineHeight: this.props.height + 'px'}}>{this.props.text}</span>
      </div>
    )
  }
}

Button.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  text: PropTypes.string,
  fontSize: PropTypes.number,
  style: PropTypes.object,
  onClick: PropTypes.func.isRequired
}

Button.defaultProps = {
  width: 130,
  height: 70,
  text: 'Button',
  fontSize: 34,
  style: {}
}