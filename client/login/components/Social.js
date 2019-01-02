import React from 'react';

import spread from '../assets/card-spread.mp3'
import fold from '../assets/card-fold.mp3'

export default class Social extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      flap: { className: '', open: false }
    }
    this.links = {}
    this.props.clients.map(client => {
      this.state[client] = { style: {} }
    })
    this.spread = new Audio(spread)
    this.fold = new Audio(fold)
  }

  flapClickHandler = _ => {
    let new_state = { flap: { className: 'flap-open', open: !this.state.flap.open } }
    this.props.clients.map(client => {
      new_state[client] = {
        style: this.state.flap.open ? {} : {
          left : Math.floor(Math.random() * 11 - 5),
          transform : `rotate(${Math.floor(Math.random() * 11 - 5)}deg)`
        }
      }
    })
    this.setState(new_state)
    if (this.state.flap.open) {
        this.fold.play()
    }
    else {
        this.spread.play()
    }
    setTimeout(() => this.setState(prevState => ({ flap: { ...prevState.flap, className: '' } })), 500)
  }

  redirect = client => {
    if (this.state.flap.open)
      this.links[client].href = TemplateContext.social[client]
  }

  render() {
    let social_list = this.props.clients.map((client, index) =>
      (
        <li key={index} className={`${client} ${ this.state.flap.open ? '' : 'folded' }`} style={this.state[client].style}>
          <a ref={el => this.links[client] = el} onClick={() => this.redirect(client)}>
            <span>{`${client.charAt(0).toUpperCase()}${client.substr(1)}`}</span>
          </a>
        </li>
      )
    )
    return (
      <div className={`social ${ this.state.flap.open ? 'expanded' : '' }`} ref={el => this.social = el}>
        <span className={this.state.flap.className} onClick={this.flapClickHandler}><span className='phone'>Sign in with ...</span></span>
        <ul>
          {social_list}
        </ul>
      </div>
    )
  }
}