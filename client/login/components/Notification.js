import React from 'react';

export default class Notification extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      show: false
    }
    this.initialShow = this.props.show ? true : false
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.navigate && nextProps.message) {
      this.setState({ show: true })
      setTimeout(() => this.setState({ show: false }), 6000)
    }
  }

  componentDidMount() {
    if (this.initialShow) {
      this.initialShow = false
      setTimeout(() => this.setState({ show: false }), 8000)
    }
  } 

  render() {
    return (
      <div className='notification'>
        <div className={`message ${this.props.type} ${(this.state.show || this.initialShow) ? 'show' : ''}`}>
          {this.props.message}
        </div>
      </div>
    )
  }
}