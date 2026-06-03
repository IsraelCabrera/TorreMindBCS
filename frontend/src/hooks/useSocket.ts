import { useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"

export function useSocket() {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io("/", {
      path: "/ws/socket.io",
      transports: ["polling", "websocket"],
      reconnectionDelay: 5000,
      reconnectionDelayMax: 30000,
      timeout: 5000,
    })
    socketRef.current = socket
    socket.on("connect", () => setConnected(true))
    socket.on("disconnect", () => setConnected(false))
    socket.on("connect_error", () => {
      /* connection errors are handled by reconnection logic */
    })
    return () => { socket.close() }
  }, [])

  const on = (event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler)
    return () => { socketRef.current?.off(event, handler) }
  }

  return { connected, socket: socketRef.current, on }
}
