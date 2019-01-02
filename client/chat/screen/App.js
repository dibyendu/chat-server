import React from 'react'
import Button from '../../common/widgets/Button'
import Dropdown from '../../common/widgets/Dropdown'
import Input from '../../common/widgets/Input'

export default class App extends React.Component {

  constructor(props) {
    super(props)
    if (!FontLoadStatus.loaded)
      FontLoadStatus.onFontsLoad(() => this.setState({ loading: false }))

    this.state = {
      loading: !FontLoadStatus.loaded,

      receiver: {name: '', ids: ''},
      message: '',
      active_users: [],
      chats: []
    }

    this.inputField = null
    this.chats = []
    this.chatIndex = 0
  }

  componentDidMount() {
    this.user_name = USER_NAME
    this.user_id = USER_ID
    this.socket = new Ws(WEBSOCKET_URL)

    this.socket.OnConnect(() => {
      this.socket.Emit('register user', {name: this.user_name, id: this.user_id})
    })

    this.socket.On('active users', users => {
      users = JSON.parse(users)
      let active_users = []
      users.forEach(value => {
        if (value['uuid'] === this.user_id)
          return
        active_users.push({name: value['user-name'], value: value['socket-id'] + '|' + value['uuid']})
      })
      this.setState({active_users})
    })

    this.socket.On('chat message from server', data => {
      data = JSON.parse(data)
      this.chats.push(<li key={this.chatIndex} style={{textAlign: 'left'}}><span style={{fontWeight: 'bold', color: 'red'}}>{data['from']}</span>: {data['message']}</li>)
      this.chatIndex += 1
      this.setState({chats: this.chats})
    })

    this.socket.On('chat msg send ack', data => {
      data = JSON.parse(data)
      if (data['success']) {
        this.chats.push(<li key={this.chatIndex} style={{textAlign: 'right'}}>{data['message']}</li>)
        this.chatIndex += 1
        this.setState({chats: this.chats})
      }
    })
  }

  render() {

    if (this.state.loading)
      return null

    return (
      <div>
        <Dropdown text='Chat with' style={{display: 'block', margin: '0 auto'}} width={200} height={40} options={this.state.active_users} onChange={(text, value) => {
          this.setState({receiver: {name: text, ids: value}})
        }}/>

        <ul className='messages'>{this.state.chats}</ul>

        <div className='form'>
          <Button text='Send' width={130} height={40} fontSize={30} onClick={_ => {
            let message = this.state.message,
                ignore_receiver_name = this.state.receiver.name,
                receiver_ids = this.state.receiver.ids
            if (message && receiver_ids) {
              let receiver_socket_id = receiver_ids.split('|')[0],
                  ignore_receiver_uuid = receiver_ids.split('|')[1]
              this.socket.Emit('chat message to server', {sender: this.user_name, socket_id: receiver_socket_id, message: message})
              this.inputField.clear()
              this.setState({message: ''})
            }
          }}/>
          <Input ref={el => this.inputField = el} placeHolder='Type your message here' width={1000} height={40} onChange={value => {
            this.setState({message: value})
          }}/>
        </div>
      </div>
    )
  }
}
