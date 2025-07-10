# ExcaliDraw - Collaborative Drawing & Chat App

A real-time collaborative drawing application with integrated chat functionality, built using Next.js, TypeScript, WebSockets, and Prisma. This app allows multiple users to join drawing rooms, create and modify shapes on a shared canvas, and communicate through an integrated chat system.

![ExcaliDraw](chatRoom.png)

## Features

- **Collaborative Drawing Tools**:
  - **Shape Tools**: Rectangle, Circle, Text
  - **Freehand Drawing**: Pencil tool for free-form drawing
  - **Selection Tool**: Select and move existing shapes
  - **Pan/Drag Tool**: Navigate the canvas with pan and zoom functionality
  - **Color & Stroke Controls**: Customize your drawing style
  - **Delete**: Remove selected shapes
  - **Zoom Functionality**: Ctrl+scroll when drag tool is selected

- **Real-time Collaboration**:
  - **Instant Updates**: All drawing actions broadcast to all users in real-time
  - **Integrated Chat**: Toggle sidebar for text communication while drawing
  - **Connection Status**: Visual indicator shows WebSocket connection state
  - **Persistent Storage**: Drawing and chat history persisted to database

- **Responsive Design**:
  - **Cross-Device Support**: Works on desktop, tablet, and mobile devices
  - **Touch Support**: Full drawing support via touch events on mobile/tablet
  - **Adaptive UI**: Responsive toolbar, controls, and layout
  - **Mobile-Optimized**: Bottom controls on mobile for better usability

- **User Management**:
  - **Authentication**: Secure sign-up and login with JWT
  - **Room Management**: Create, join, and manage drawing rooms
  - **User Dashboard**: Overview of available rooms

## Tech Stack

- **Frontend**:
  - **Next.js 15**: App Router for modern React architecture
  - **React 19**: Latest React features
  - **TypeScript**: Full type safety
  - **Tailwind CSS**: Responsive styling
  - **HTML5 Canvas API**: Custom drawing implementation
  - **Lucide React**: UI icons

- **Backend**:
  - **WebSocket Server**: Real-time communication for drawing and chat
  - **Express REST API**: Authentication and data persistence
  - **Prisma ORM**: Type-safe database access
  - **PostgreSQL**: Relational database storage
  - **JWT**: Secure authentication

- **Infrastructure**:
  - **Turborepo**: Monorepo management
  - **pnpm**: Fast, disk-efficient package manager
  - **Shared Packages**: Types, config, and UI components

## Project Structure

The project is organized as a Turborepo monorepo with the following components:

### Apps

- `web`: Next.js frontend application
  - `app`: Next.js App Router pages
  - `components`: React components for UI
  - `draw`: Canvas and drawing logic
  - `contexts`: React context providers

- `ws-backend`: WebSocket server for real-time features
  - Handles drawing broadcasts
  - Manages chat messaging
  - Tracks room participation

- `http-backend`: Express REST API
  - Authentication endpoints
  - Room management
  - Chat history

### Packages

- `database`: Prisma schema and client
- `shared_zod`: Shared validation schemas
- `ui`: Reusable UI components
- Config packages for ESLint, TypeScript, and Tailwind

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm
- PostgreSQL database

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/draw-app-excalidraw.git
   cd draw-app-excalidraw
   ```

2. Install dependencies:
   ```sh
   pnpm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/excalidraw?schema=public"
   JWT_SECRET="your-secret-key"
   NEXT_PUBLIC_BACKEND_HTTP_URL="http://localhost:3001"
   NEXT_PUBLIC_BACKEND_WS_URL="ws://localhost:3002"
   ```

4. Set up the database:
   ```sh
   cd packages/database
   pnpm prisma db push
   ```

5. Start the development servers:
   ```sh
   pnpm dev
   ```
   This will start:
   - Frontend: http://localhost:3000
   - HTTP Backend: http://localhost:3001
   - WebSocket Backend: http://localhost:3002

## Usage

### Authentication
1. Register a new account or log in with existing credentials
2. Access the dashboard after successful authentication

### Drawing Rooms
1. Create a new drawing room or join an existing one by slug
2. View a list of your rooms on the dashboard

### Drawing Tools
- **Select a Tool**: Click on the tool icon in the toolbar
- **Shapes**: Click and drag to create rectangles and circles
- **Pencil**: Click and drag to draw freehand
- **Text**: Click to place text and type your content
- **Selection**: Click on shapes to select them, then drag to move
- **Pan/Drag**: Click and drag to move around the canvas
- **Zoom**: Hold Ctrl and scroll to zoom in/out (when drag tool is selected)
- **Delete**: Select a shape and click the delete button

### Chat
- Toggle the chat sidebar using the chat button
- Type messages and communicate with others in the room
- Chat history is preserved along with drawings

### Mobile Usage
- Use touch gestures for drawing and panning
- UI adapts automatically to smaller screens
- Controls positioned for easy thumb access on mobile

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by [Excalidraw](https://excalidraw.com/)
- Built with [Next.js](https://nextjs.org/) and [Turborepo](https://turbo.build/repo)
- Special thanks to all contributors and the open-source community
