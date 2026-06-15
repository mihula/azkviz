import { Server } from 'socket.io'
import { ServerToClientEvents, ClientToServerEvents } from 'azkivz-shared'

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>

let instance: TypedServer | null = null

export function setIo(io: TypedServer) {
  instance = io
}

export function getIo(): TypedServer | null {
  return instance
}
