import React from 'react'
import rough from 'roughjs'
import PropTypes from 'prop-types'

export default class Input extends React.Component {

  constructor(props) {
    super(props)
  }

  componentDidMount() {
    let gutter = 2
    rough.canvas(this.border).rectangle(gutter, gutter, this.props.width - 2 * gutter, this.props.height - 2 * gutter, {
      roughness: 2
    })
  }

  clear() {
    this.input.value = ''
  }

  render() {
    return (
      <div
        className='input'
        style={Object.assign({
          width: this.props.width,
          height: this.props.height,
        }, this.props.style)}>
        <canvas
          ref={el => this.border = el}
          width={this.props.width}
          height={this.props.height}/>
        <input
          ref={el => this.input = el}
          placeholder={this.props.placeHolder}
          style={{
            width: this.props.width - 10,
            height: this.props.height - 10,
            lineHeight: this.props.height,
            fontSize: this.props.height - 10,
            left: 5,
            top: 5
          }}
          autoComplete='off'
          spellCheck='true'
          maxLength={this.props.maxLength}
          onChange={({ target: { value }}) => {
            this.props.onChange(value)
          }}
        />
      </div>
    )
  }
}

Input.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  maxLength: PropTypes.number,
  placeHolder: PropTypes.string,
  style: PropTypes.object,
  onChange: PropTypes.func.isRequired
}

Input.defaultProps = {
  width: 140,
  height: 40,
  maxLength: 40,
  placeHolder: '',
  style: {}
}