import React from 'react'
import rough from 'roughjs'
import PropTypes from 'prop-types'

export default class Dropdown extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      text: this.props.text,
      value: null
    }
    this.boxes = []
    this._checkBoxId = Math.floor((Math.random() * 1000000) + 1)
  }

  /*
   * https://reactjs.org/docs/refs-and-the-dom.html#caveats-with-callback-refs
   */
  refBox = el => {
    if (el)
      this.boxes.push(el)
  }

  matchOptions(oldOptions, newOptions) {
    let match = true
    oldOptions.forEach(oldOption => {
      match &= newOptions.some(newOption => oldOption.name === newOption.name && oldOption.value === newOption.value)
    })
    if (match) {
      newOptions.forEach(newOption => {
        match &= oldOptions.some(oldOption => oldOption.name === newOption.name && oldOption.value === newOption.value)
      })
    }
    return match
  }

  componentWillUpdate(nextProps, nextState) {
    this.boxes = []
  }

  componentDidUpdate(prevProps, prevState) {
    if (!this.matchOptions(prevProps.options, this.props.options)) {
      let gutter = 5,
      a = this.props.height - 2 * gutter // (a/2 - √3a/4, a/8) -> (a/2, 7a/8) -> (a/2 + √3a/4, a/8) -> (a/2 - √3a/4, a/8)
      this.arrow.getContext('2d').clearRect(0, 0, this.arrow.width, this.arrow.height)
      rough.canvas(this.arrow).polygon([[a * 0.0669872981 + gutter, a * 0.125 + gutter], [a * 0.5 + gutter, a * 0.875 + gutter], [a * 0.93301270189 + gutter, a * 0.125 + gutter], [a * 0.0669872981 + gutter, a * 0.125 + gutter]], {
        fill: this.props.disabled || Math.min(this.props.options.length, this.props.showOptions) == 0 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 0, 0.5)',
        fillWeight: 1,
        fillStyle: this.props.disabled || Math.min(this.props.options.length, this.props.showOptions) == 0 ? 'cross-hatch' : 'zigzag',
        hachureAngle: 60,
        hachureGap: this.props.disabled || Math.min(this.props.options.length, this.props.showOptions) == 0 ? 3 : 2,
        roughness: 1
      })
      let padding = 2
      this.boxes.map(el => el && rough.canvas(el).rectangle(padding, padding, this.props.width - 2 * padding, this.props.height - 2 * padding, {
        roughness: 1,
        fill: 'rgba(255, 255, 0, 0.5)',
        fillWeight: 1,
        fillStyle: 'zigzag',
        hachureAngle: 60,
        hachureGap: 5
      }))
      if (!this.props.options.some(option => option.name === this.state.text && option.value === this.state.value)) {
        this.setState({text: this.props.text, value: null})
        this.props.onChange(this.props.text, null)
      }
    }
  }

  componentDidMount() {
    rough.canvas(this.bottomBorder).line(0, 2.5, this.props.width, 2.5, {
      roughness: 1
    })
    let gutter = 5,
    a = this.props.height - 2 * gutter // (a/2 - √3a/4, a/8) -> (a/2, 7a/8) -> (a/2 + √3a/4, a/8) -> (a/2 - √3a/4, a/8)
    rough.canvas(this.arrow).polygon([[a * 0.0669872981 + gutter, a * 0.125 + gutter], [a * 0.5 + gutter, a * 0.875 + gutter], [a * 0.93301270189 + gutter, a * 0.125 + gutter], [a * 0.0669872981 + gutter, a * 0.125 + gutter]], {
      fill: this.props.disabled || Math.min(this.props.options.length, this.props.showOptions) === 0 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 0, 0.5)',
      fillWeight: 1,
      fillStyle: this.props.disabled || Math.min(this.props.options.length, this.props.showOptions) === 0 ? 'cross-hatch' : 'zigzag',
      hachureAngle: 60,
      hachureGap: this.props.disabled || Math.min(this.props.options.length, this.props.showOptions) === 0 ? 3 : 2,
      roughness: 1
    })
    rough.canvas(this.sideBorder).line(2, 0, 2, this.props.height, {
      roughness: 1
    })
    let padding = 2
    this.boxes.map(el => el && rough.canvas(el).rectangle(padding, padding, this.props.width - 2 * padding, this.props.height - 2 * padding, {
      roughness: 1,
      fill: 'rgba(255, 255, 0, 0.5)',
      fillWeight: 1,
      fillStyle: 'zigzag',
      hachureAngle: 60,
      hachureGap: 5
    }))
  }

  render() {
    return (
      <div
        className='select'
        style={Object.assign({
          width: this.props.width,
          height: this.props.height
        }, this.props.style)}>
        <input
          type='checkbox'
          id={this._checkBoxId.toString()}/>
        <label
          htmlFor={this._checkBoxId.toString()}
          style={{width: this.props.width}}>
          <div
            className='options'
            style={{width: this.props.width - this.props.height - 4, height: this.props.height, lineHeight: this.props.height + 'px'}}>
            <span className='selected'>
              {this.props.options.length ? this.state.text : this.props.text}
            </span>
            <ul style={Object.assign({
                width: this.props.width,
                height: Math.min(this.props.options.length, this.props.showOptions) * (this.props.height + 5) + this.props.height / 2
              }, Math.min(this.props.options.length, this.props.showOptions) === 0 ? {display: 'none'} : {})
            }>
              {
                this.props.options.length ?
                this.props.options.map((option, index) =>
                  <li
                    key={index}
                    style={{height: this.props.height}}
                    onClick={e => {
                      if (this.state.text !== option.name && this.state.value !== option.value) {
                        this.setState({text: option.name, value: option.value})
                        this.props.onChange(option.name, option.value)
                      }
                    }}
                  >
                    <canvas
                      ref={this.refBox}
                      width={this.props.width}
                      height={this.props.height}/>
                    <span style={{
                      top: -this.props.height,
                      width: this.props.width,
                      height: this.props.height,
                      lineHeight: this.props.height + 'px'
                    }}>
                      {option.name}
                    </span>
                  </li>
                ) :
                null
              }
            </ul>
          </div>
          <canvas
            ref={el => this.bottomBorder = el}
            width={this.props.width}
            height={5}
            style={{top: -5}}/>
          <canvas
            ref={el => this.sideBorder = el}
            width={4}
            height={this.props.height}
            style={{top: -this.props.height - 5, left: this.props.width - this.props.height - 4}}/>
          <canvas
            ref={el => this.arrow = el}
            width={this.props.height}
            height={this.props.height}
            style={{top: -this.props.height - 5, left: this.props.width - this.props.height - 4}}/>
        </label>
      </div>
    )
  }
}

Dropdown.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  showOptions: PropTypes.number,
  options: PropTypes.array,
  text : PropTypes.string,
  style: PropTypes.object,
  onChange: PropTypes.func.isRequired
}

Dropdown.defaultProps = {
  width: 130,
  height: 30,
  showOptions: 4,
  options: [],
  text: 'Select',
  style: {}
}