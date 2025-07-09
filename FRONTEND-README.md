# Chat Application - ExcaliDraw Frontend

A complete real-time chat application built with React, Next.js, and WebSocket integration. This application provides room-based chat functionality with user authentication, room management, and real-time messaging.

## Features

### 🔐 Authentication
- **Sign Up**: Create new user accounts with email and password
- **Sign In**: Authenticate existing users with JWT tokens
- **Protected Routes**: All chat features require authentication
- **Secure Password Storage**: Uses bcrypt for password hashing

### 🏠 Dashboard
- **Room Management**: Create new chat rooms with custom slugs
- **Join Rooms**: Join existing rooms by entering their slug
- **Room List**: View all rooms you've created (admin rooms)
- **Room Actions**: Enter rooms or delete them (admin only)

### 💬 Real-time Chat
- **Live Messaging**: Real-time chat using WebSocket connections
- **Message History**: Load previous messages via HTTP API
- **Auto-scroll**: Messages automatically scroll to show latest
- **Connection Status**: Visual indicator of connection state
- **User Identification**: See who sent each message

### 🛠 Technical Features
- **JWT Authentication**: Secure token-based authentication
- **WebSocket Integration**: Real-time communication with automatic reconnection
- **Database Integration**: Persistent message and room storage
- **Type Safety**: Full TypeScript support throughout
- **Error Handling**: Comprehensive error handling and user feedback
- **Responsive Design**: Works on desktop and mobile devices

## Architecture

### Frontend (Next.js App)
- **React 19** with Next.js 15
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Axios** for HTTP requests
- **WebSocket** for real-time communication

### Backend Services
- **HTTP Backend** (Port 3001): REST API for authentication and data
- **WebSocket Backend** (Port 3002): Real-time messaging
- **Database**: PostgreSQL with Prisma ORM

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- pnpm (package manager)
- PostgreSQL database

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables in `.env`:
   ```env
   DATABASE_URL="your-postgresql-connection-string"
   JWT_SECRET="your-jwt-secret-key"
   NEXT_PUBLIC_BACKEND_HTTP_URL="http://localhost:3001"
   NEXT_PUBLIC_BACKEND_WS_URL="ws://localhost:3002"
   ```

### Running the Application
1. Start all services:
   ```bash
   npm run dev
   ```
   This will start:
   - Frontend: http://localhost:3000
   - HTTP Backend: http://localhost:3001
   - WebSocket Backend: http://localhost:3002

2. Open your browser and navigate to `http://localhost:3000`

## Usage Guide

### 1. Authentication
- **First Time Users**: Click "Sign up" to create an account
- **Existing Users**: Use "Sign in" with your credentials
- **Security**: Passwords are securely hashed and stored

### 2. Dashboard
After signing in, you'll see the main dashboard with:
- **Create Room**: Enter a unique room name/slug and click "Create"
- **Join Room**: Enter an existing room's slug and click "Join"
- **Your Rooms**: List of rooms you've created with options to enter or delete

### 3. Chat Room
Once you enter a room:
- **Previous Messages**: Automatically loaded when joining
- **Send Messages**: Type in the input field and press Enter or click Send
- **Real-time Updates**: See messages from other users instantly
- **Connection Status**: Green dot indicates active connection
- **Leave Room**: Click the "← Back" button to return to dashboard

## API Endpoints

### Authentication
- `POST /signup` - Create new user account
- `POST /signin` - Authenticate user and get JWT token

### Room Management
- `POST /room` - Create new room (requires auth)
- `DELETE /room` - Delete room (admin only)
- `GET /room/:slug` - Get room ID by slug (requires auth)

### Chat
- `GET /chats/:roomId` - Get chat history for room (requires auth)

### WebSocket Events
- `join_room` - Join a chat room
- `leave_room` - Leave a chat room
- `chat` - Send/receive chat messages

## Environment Variables

### Root `.env` file
```env
# Database
DATABASE_URL="postgresql://..."

# JWT Authentication
JWT_SECRET="your-secret-key"

# Frontend URLs (Next.js)
NEXT_PUBLIC_BACKEND_HTTP_URL="http://localhost:3001"
NEXT_PUBLIC_BACKEND_WS_URL="ws://localhost:3002"
```

## Development

### Project Structure
```
apps/
├── web/                    # Next.js frontend
│   ├── app/               # Next.js app router
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   └── ...
├── http-backend/          # REST API server
└── ws-backend/           # WebSocket server

packages/
├── database/             # Prisma schema and client
├── shared_zod/          # Shared validation schemas
└── ...
```

### Key Components
- **AuthContext**: Global authentication state management
- **AuthForm**: Login/signup form component
- **Dashboard**: Main dashboard with room management
- **ChatRoomClient**: Real-time chat interface

### WebSocket Integration
The application uses WebSocket for real-time communication:
- **Authentication**: JWT token sent via query parameter
- **Room Management**: Join/leave rooms dynamically
- **Message Broadcasting**: Real-time message distribution
- **Auto-reconnection**: Automatic reconnection on connection loss

## Security Features

### Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Protected Routes**: All chat features require authentication
- **Token Expiration**: 24-hour token validity

### WebSocket Security
- **Token Validation**: JWT verification on WebSocket connection
- **Room Authorization**: Users can only access rooms they're authorized for
- **Message Validation**: All messages validated before processing

## Troubleshooting

### Common Issues
1. **Connection Failed**: Check backend services are running
2. **Authentication Errors**: Verify JWT_SECRET is set correctly
3. **Database Errors**: Ensure PostgreSQL is running and DATABASE_URL is correct
4. **WebSocket Issues**: Check firewall settings and WebSocket URL

### Debug Mode
- Open browser developer tools to see console logs
- Check Network tab for HTTP request/response details
- WebSocket messages are logged in console

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
