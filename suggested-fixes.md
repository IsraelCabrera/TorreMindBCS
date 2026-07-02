# Suggested Improvements (not yet implemented)

## Socket.IO Client — Excessive HTTP Reconnections

### Problem

The `useSocket` hook in `frontend/src/hooks/useSocket.ts` has two issues that can generate a high volume of HTTP requests:

1. **Unlimited reconnection** — `reconnectionAttempts` defaults to `Infinity`. If the backend is unreachable, the client fires HTTP polling requests forever.
2. **Polling-first transport** — `transports: ["polling", "websocket"]` means every connection starts with 2+ HTTP requests before upgrading to WebSocket.
3. **Socket tied to a remounting component** — `StatusBoard` uses `key={refreshKey}`, so every check-in/delivery success unmounts and remounts the component, creating a fresh socket connection each time.

### Suggested Fix

```ts
// frontend/src/hooks/useSocket.ts
const socket = useRef<Socket | null>(null)

useEffect(() => {
  socket.current = io("/", {
    path: "/ws/socket.io",
    transports: ["websocket"],          // skip HTTP polling
    reconnection: true,
    reconnectionAttempts: 5,             // stop after 5 failed retries
    reconnectionDelay: 2000,             // start at 2s
    reconnectionDelayMax: 15000,         // cap at 15s
    timeout: 5000,
  })
  // ...
  return () => { socket.current?.close() }
}, [])
```

And lift the socket instance to a React context so it persists across component remounts instead of being tied to `StatusBoard`.

### When to Apply

- **Now** if the backend will ever be behind a domain that charges per request (ngrok, etc.), since every reconnect attempt burns HTTP calls.
- **Definitely** if the product owner asks for **remote administration** (accessing the dashboard from outside the local network), because then the Socket.IO traffic would again flow through ngrok or a public domain, making every unnecessary retry costly.
