# Temperature Monitoring System - Implementation Plan

## Project Overview

Build a full-stack temperature monitoring application with:
- **Backend**: NodeJS server that reads binary sensor data from a local process
- **Frontend**: Angular v20 web app displaying sensor statistics and live updates

---

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  measure_temp   │─────▶│  NodeJS Backend │─────▶│ Angular Frontend│
│   (binary)      │ stdout│  (API Server)   │ HTTP │   (Web App)     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## Part 1: Backend (NodeJS)

### 1.1 Project Setup

- Initialize Node.js project with TypeScript
- Configure strict TypeScript settings (`tsconfig.json`)
- Install dependencies:
  - `express` - HTTP server
  - `cors` - Cross-origin support
  - `ws` or `socket.io` - WebSocket for live updates
- Set up ESLint for consistent code style

### 1.2 Binary Data Parser

**Data Structure (2 bytes per message):**

| Bits  | 0-1           | 2-7              | 8-15                |
|-------|---------------|------------------|---------------------|
| Field | Message Type  | Sensor ID (0-63) | Temperature (0-255) |

**Parsing Logic:**
```typescript
function parseMessage(buffer: Buffer): SensorReading | null {
  const byte1 = buffer[0];
  const byte2 = buffer[1];

  // Extract message type (bits 0-1 of byte1)
  const messageType = byte1 & 0b00000011;

  // Only process type 2 messages (binary: 10)
  if (messageType !== 2) return null;

  // Extract sensor ID (bits 2-7 of byte1)
  const sensorId = (byte1 >> 2) & 0b00111111;

  // Temperature is the entire second byte
  const temperature = byte2;

  return { sensorId, temperature, timestamp: Date.now() };
}
```

### 1.3 Sensor Data Service

Responsibilities:
- Spawn `measure_temp` process
- Buffer incoming data and parse 2-byte chunks
- Maintain in-memory state:
  - Set of active sensor IDs
  - Message count and timestamps for rate calculation
  - Temperature readings per sensor for averaging
- Emit events for new readings

### 1.4 REST API Endpoints

| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/api/stats`          | Active sensors count, msg/min rate   |
| GET    | `/api/sensors`        | All sensors with average temperatures|
| GET    | `/api/sensors/:id`    | Single sensor details                |

### 1.5 WebSocket for Live Updates

- Endpoint: `ws://localhost:3000/ws`
- Events:
  - `sensor:reading` - New reading from any sensor
  - `sensor:subscribe` - Client subscribes to specific sensor ID
  - `sensor:unsubscribe` - Client unsubscribes

### 1.6 Testing Strategy

**Option A: Mock Process (Recommended)**
- Create a mock `measure_temp` simulator that emits random valid binary data
- Allows full end-to-end testing without real hardware
- Configurable emission rate and sensor count

**Option B: Abstract the Data Source**
- Create an interface for the data source
- Inject mock implementation during tests
- Production uses real child process

---

## Part 2: Frontend (Angular v20)

### 2.1 Project Setup

- Generate Angular 20 project with standalone components
- Configure strict TypeScript
- Install dependencies:
  - Angular Material or Tailwind CSS for responsive UI
- Set up environment configurations

### 2.2 Core Services

**SensorApiService**
- HTTP client for REST endpoints
- Error handling with retry logic
- Response type definitions

**WebSocketService**
- Manage WebSocket connection
- Reconnection logic
- Observable streams for live data

### 2.3 Components Structure

```
src/app/
├── components/
│   ├── dashboard/           # Main container
│   ├── stats-card/          # Active sensors, msg/min display
│   ├── sensor-table/        # Average temps table
│   ├── sensor-detail/       # Live updates for selected sensor
│   └── error-banner/        # Error display with refresh button
├── services/
│   ├── sensor-api.service.ts
│   └── websocket.service.ts
├── models/
│   └── sensor.models.ts
└── app.component.ts
```

### 2.4 Dashboard Features

1. **Stats Cards**
   - Number of active sensors (since server start)
   - Average messages received per minute

2. **Sensor Table**
   - Columns: Sensor ID, Average Temperature, Reading Count
   - Sortable columns
   - Click row to select sensor for live view

3. **Live Sensor View**
   - Dropdown or input to select sensor by ID
   - Real-time temperature display
   - Timestamp of last reading
   - Optional: Mini chart of recent readings

4. **Error Handling**
   - Global error interceptor
   - Error banner with "Refresh Page" button
   - Connection status indicator

### 2.5 Responsive Design

- Mobile-first approach
- Breakpoints:
  - Mobile: < 768px (stacked layout)
  - Desktop: >= 768px (grid layout)
- Use CSS Grid/Flexbox for layouts

---

## Part 3: Project Structure

### Monorepo Option (Recommended)
```
temperature-monitor/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── sensor-data.service.ts
│   │   │   └── binary-parser.ts
│   │   ├── routes/
│   │   │   └── sensor.routes.ts
│   │   ├── websocket/
│   │   │   └── socket-handler.ts
│   │   ├── mock/
│   │   │   └── mock-temp-process.ts
│   │   └── index.ts
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   └── app/
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## Part 4: Implementation Order

### Phase 1: Backend Core
1. [ ] Initialize Node.js project with TypeScript
2. [ ] Implement binary parser with unit tests
3. [ ] Create sensor data service (in-memory state)
4. [ ] Build REST API endpoints
5. [ ] Add WebSocket support

### Phase 2: Backend Testing
6. [ ] Create mock temperature process
7. [ ] Integration tests for API endpoints
8. [ ] Test WebSocket functionality

### Phase 3: Frontend Core
9. [ ] Initialize Angular 20 project
10. [ ] Create data models and API service
11. [ ] Build dashboard layout (responsive)
12. [ ] Implement stats cards component
13. [ ] Build sensor table component

### Phase 4: Frontend Live Features
14. [ ] Implement WebSocket service
15. [ ] Build live sensor detail component
16. [ ] Add error handling and banner

### Phase 5: Polish
17. [ ] End-to-end testing
18. [ ] UI/UX improvements
19. [ ] Documentation
20. [ ] Final review and cleanup

---

## Technical Decisions

### Why WebSocket for Live Updates?
- Real-time push from server (vs polling)
- Efficient for high-frequency sensor data
- Native browser support

### State Management
- Backend: Simple in-memory Maps/Sets (sufficient for single-server)
- Frontend: RxJS observables + Angular signals (Angular 20 feature)

### Error Handling Strategy
- HTTP interceptor catches all API errors
- Show user-friendly error banner
- Log detailed errors to console
- Automatic retry for transient failures

---

## Configuration

### Backend Environment Variables
```
PORT=3000
MOCK_MODE=true          # Use mock process instead of real measure_temp
MOCK_SENSOR_COUNT=10    # Number of simulated sensors
MOCK_INTERVAL_MS=2000   # Interval between mock readings
```

### Frontend Environment
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3000/ws'
};
```

---

## Validation Checklist

- [ ] TypeScript strict mode enabled (both projects)
- [ ] ESLint configured with consistent rules
- [ ] Responsive design works on mobile and desktop
- [ ] Error states show refresh prompt
- [ ] WebSocket reconnects on disconnect
- [ ] Binary parser correctly handles type 2 messages only
- [ ] Git repository initialized with meaningful commits
