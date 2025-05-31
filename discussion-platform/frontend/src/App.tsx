import React, { useState } from 'react'
import './App.css'
import Home from './components/Home.tsx'
import Room from './components/Room.tsx'

function App() {
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')

  const joinRoom = (roomId: string, name: string) => {
    setCurrentRoom(roomId)
    setUserName(name)
  }

  const leaveRoom = () => {
    setCurrentRoom(null)
    setUserName('')
  }

  return (
    <div className="App">
      {currentRoom ? (
        <Room 
          roomId={currentRoom} 
          userName={userName} 
          onLeave={leaveRoom}
        />
      ) : (
        <Home onJoinRoom={joinRoom} />
      )}
    </div>
  )
}

export default App
