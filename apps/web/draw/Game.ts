import { getExistingShapes } from "./http";
import { Shape, Tool } from "./types";

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private existingShapes: Shape[] = [];
    private roomId: string;
    private clicked: boolean = false;
    private startX = 0;
    private startY = 0;
    private selectedTool: Tool = "circle";
    private selectedColor: string = "#FFFFFF"; // Default white
    private strokeWidth: number = 2;
    private loadingShapes: boolean = false;
    private shapeLoadRetryCount: number = 0;
    private maxShapeLoadRetries: number = 3;
    private offsetX: number = 0;
    private offsetY: number = 0;
    private lastDragX: number = 0;
    private lastDragY: number = 0;
    private zoomLevel: number = 1.0;
    private minZoom: number = 0.1;
    private maxZoom: number = 5.0;

    socket: WebSocket;

    constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.roomId = roomId;
        this.socket = socket;
        this.init();
        this.initHandlers();
        this.initMouseHandlers();
        
        // Set up a retry mechanism for shape loading
        this.setupShapeLoadingRetry();
    }
    
    destroy() {
        this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
        this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
        this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
        this.canvas.removeEventListener("wheel", this.wheelHandler);
    }

    setTool(tool: Tool) {
        this.selectedTool = tool;
    }

    setColor(color: string) {
        this.selectedColor = color;
    }

    setStrokeWidth(width: number) {
        this.strokeWidth = width;
    }

    async init() {
        if (this.loadingShapes) return;
        
        this.loadingShapes = true;
        try {
            console.log("Initializing game for room:", this.roomId);
            this.existingShapes = await getExistingShapes(this.roomId);
            console.log("Loaded shapes via HTTP:", this.existingShapes.length);
            this.clearCanvas();
            
            // Reset retry count on success
            this.shapeLoadRetryCount = 0;
        } catch (error) {
            console.error("Error initializing game via HTTP:", error);
            
            // If HTTP fails, we'll immediately try WebSocket if it's ready
            this.tryWebSocketFallback();
        } finally {
            this.loadingShapes = false;
        }
    }

    setupShapeLoadingRetry() {
        // Wait for WebSocket to be ready, then set up retry mechanisms
        const checkSocketAndSetup = () => {
            if (this.socket.readyState === WebSocket.OPEN) {
                console.log("Setting up WebSocket fallback for shape loading");
                
                // Try WebSocket immediately as a secondary source of shapes
                setTimeout(() => {
                    // If we already have shapes, no need to request again
                    if (this.existingShapes.length === 0) {
                        this.requestShapesFromServer();
                    }
                }, 2000);
            } else if (this.socket.readyState === WebSocket.CONNECTING) {
                // Try again after a short delay
                setTimeout(checkSocketAndSetup, 500);
            } else {
                console.warn("WebSocket in unexpected state:", this.socket.readyState);
            }
        };
        
        // Start checking
        setTimeout(checkSocketAndSetup, 500);
    }

    initHandlers() {
        // Store the original onmessage handler
        const originalOnMessage = this.socket.onmessage;
        
        // Set up our own handler
        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log("Game received message:", message.type);

                if (message.type === "chat") {
                    try {
                        const parsedData = JSON.parse(message.message);
                        if (parsedData.shape) {
                            console.log("Received shape via chat:", parsedData.shape.type);
                            this.existingShapes.push(parsedData.shape);
                            this.clearCanvas();
                        } else {
                            // Regular chat message, not a shape
                            // Let the original handler process it if it exists
                            if (originalOnMessage) {
                                originalOnMessage.call(this.socket, event);
                            }
                        }
                    } catch {
                        // Regular chat message, not a shape
                        // Let the original handler process it if it exists
                        if (originalOnMessage) {
                            originalOnMessage.call(this.socket, event);
                        }
                    }
                } else if (message.type === "draw") {
                    try {
                        const parsedData = JSON.parse(message.shape_data);
                        if (parsedData.shape) {
                            console.log("Received shape via draw:", parsedData.shape.type);
                            this.existingShapes.push(parsedData.shape);
                            this.clearCanvas();
                        }
                    } catch (err) {
                        console.error("Error parsing drawing data:", err);
                    }
                } else if (message.type === "shapes_data") {
                    // Handle shapes data response
                    try {
                        if (message.shapes && Array.isArray(message.shapes)) {
                            console.log(`Received ${message.shapes.length} shapes from WebSocket`);
                            if (message.shapes.length > 0) {
                                this.existingShapes = message.shapes;
                                this.clearCanvas();
                                
                                // Reset retry count on successful load
                                this.shapeLoadRetryCount = 0;
                            }
                        }
                    } catch (err) {
                        console.error("Error processing shapes data:", err);
                    }
                } else if (originalOnMessage) {
                    // If it's not a shape message, pass it to the original handler
                    originalOnMessage.call(this.socket, event);
                }
            } catch (err) {
                console.error("Error in WebSocket message handler:", err);
                // If there was an error parsing the message, still try to pass it to the original handler
                if (originalOnMessage) {
                    originalOnMessage.call(this.socket, event);
                }
            }
        };
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "rgba(30, 30, 30, 1)"; // Dark background
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Save current transform
        this.ctx.save();
        
        // Apply zoom transform around the center of the canvas
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        this.ctx.translate(-centerX, -centerY);

        // Draw all existing shapes
        this.existingShapes.forEach(shape => {
            if (shape.type === "rect") {
                this.ctx.strokeStyle = shape.color || "#FFFFFF";
                this.ctx.lineWidth = shape.strokeWidth || 2;
                this.ctx.strokeRect(
                    shape.x + this.offsetX, 
                    shape.y + this.offsetY, 
                    shape.width, 
                    shape.height
                );
            } else if (shape.type === "circle") {
                this.ctx.strokeStyle = shape.color || "#FFFFFF";
                this.ctx.lineWidth = shape.strokeWidth || 2;
                this.ctx.beginPath();
                this.ctx.arc(
                    shape.centerX + this.offsetX, 
                    shape.centerY + this.offsetY, 
                    Math.abs(shape.radius), 
                    0, 
                    Math.PI * 2
                );
                this.ctx.stroke();
                this.ctx.closePath();                
            } else if (shape.type === "pencil" && shape.points && shape.points.length > 1) {
                this.ctx.strokeStyle = shape.color || "#FFFFFF";
                this.ctx.lineWidth = shape.strokeWidth || 2;
                this.ctx.beginPath();
                
                const firstPoint = shape.points[0];
                if (firstPoint) {
                    this.ctx.moveTo(firstPoint.x + this.offsetX, firstPoint.y + this.offsetY);
                    
                    for (let i = 1; i < shape.points.length; i++) {
                        const point = shape.points[i];
                        if (point) {
                            this.ctx.lineTo(point.x + this.offsetX, point.y + this.offsetY);
                        }
                    }
                }
                this.ctx.stroke();
                this.ctx.closePath();
            } else if (shape.type === "text") {
                this.ctx.fillStyle = shape.color || "#FFFFFF";
                this.ctx.font = `${shape.fontSize || 20}px Arial`;
                this.ctx.fillText(shape.text, shape.x + this.offsetX, shape.y + this.offsetY);
            }
        });
        
        // Restore original transform
        this.ctx.restore();
    }

    mouseDownHandler = (e: MouseEvent) => {
        this.clicked = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        
        if (this.selectedTool === "drag") {
            // For drag tool, remember the current position
            this.lastDragX = e.clientX;
            this.lastDragY = e.clientY;
            return;
        }
        
        // Convert screen coordinates to world coordinates
        const worldX = (this.startX - (this.canvas.width / 2)) / this.zoomLevel + (this.canvas.width / 2) - this.offsetX;
        const worldY = (this.startY - (this.canvas.height / 2)) / this.zoomLevel + (this.canvas.height / 2) - this.offsetY;
        
        // For pencil, start a new shape immediately
        if (this.selectedTool === "pencil") {
            const newShape: Shape = {
                type: "pencil",
                points: [{ 
                    x: worldX, 
                    y: worldY 
                }],
                color: this.selectedColor,
                strokeWidth: this.strokeWidth
            };
            
            this.existingShapes.push(newShape);
        }
    }

    mouseUpHandler = (e: MouseEvent) => {
        if (!this.clicked) return;
        
        this.clicked = false;
        const currentX = e.clientX;
        const currentY = e.clientY;
        const width = currentX - this.startX;
        const height = currentY - this.startY;
        
        // Convert screen coordinates to world coordinates
        const worldStartX = (this.startX - (this.canvas.width / 2)) / this.zoomLevel + (this.canvas.width / 2) - this.offsetX;
        const worldStartY = (this.startY - (this.canvas.height / 2)) / this.zoomLevel + (this.canvas.height / 2) - this.offsetY;
        const worldWidth = width / this.zoomLevel;
        const worldHeight = height / this.zoomLevel;

        let shape: Shape | null = null;
        
        if (this.selectedTool === "rect") {
            shape = {
                type: "rect",
                x: worldStartX,
                y: worldStartY,
                height: worldHeight,
                width: worldWidth,
                color: this.selectedColor,
                strokeWidth: this.strokeWidth
            };
        } else if (this.selectedTool === "circle") {
            const radius = Math.max(Math.abs(worldWidth), Math.abs(worldHeight)) / 2;
            const centerX = worldStartX + (worldWidth / 2);
            const centerY = worldStartY + (worldHeight / 2);
            shape = {
                type: "circle",
                radius,
                centerX,
                centerY,
                color: this.selectedColor,
                strokeWidth: this.strokeWidth
            };
        } else if (this.selectedTool === "text") {
            const text = prompt("Enter text:");
            if (text) {
                shape = {
                    type: "text",
                    x: worldStartX,
                    y: worldStartY,
                    text,
                    color: this.selectedColor,
                    fontSize: this.strokeWidth * 10
                };
            }
        }

        if (shape) {
            // For rect and circle, we add a new shape
            this.existingShapes.push(shape);
            this.sendShapeToServer(shape);
        } else if (this.selectedTool === "pencil") {
            // For pencil, we've been adding points during mousemove
            // Send the last shape (the pencil path) to the server
            const lastShape = this.existingShapes[this.existingShapes.length - 1];
            if (lastShape && lastShape.type === "pencil") {
                this.sendShapeToServer(lastShape);
            }
        }
        
        this.clearCanvas();
    }

    mouseMoveHandler = (e: MouseEvent) => {
        if (!this.clicked) return;
        
        const currentX = e.clientX;
        const currentY = e.clientY;
        
        if (this.selectedTool === "drag") {
            // Calculate how much the mouse has moved
            const dx = currentX - this.lastDragX;
            const dy = currentY - this.lastDragY;
            
            // Update the offsets
            this.offsetX += dx;
            this.offsetY += dy;
            
            // Update the last position
            this.lastDragX = currentX;
            this.lastDragY = currentY;
            
            // Redraw everything with the new offset
            this.clearCanvas();
            return;
        }
        
        if (this.selectedTool === "pencil") {
            // Convert screen coordinates to world coordinates
            const worldX = (currentX - (this.canvas.width / 2)) / this.zoomLevel + (this.canvas.width / 2) - this.offsetX;
            const worldY = (currentY - (this.canvas.height / 2)) / this.zoomLevel + (this.canvas.height / 2) - this.offsetY;
            
            // Add point to the current pencil path
            const lastShape = this.existingShapes[this.existingShapes.length - 1];
            if (lastShape && lastShape.type === "pencil") {
                lastShape.points.push({ 
                    x: worldX, 
                    y: worldY 
                });
                this.clearCanvas();
            }
            return;
        }
        
        // For other tools, show preview
        this.clearCanvas();
        
        // Convert screen coordinates to world coordinates for preview
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Convert screen coordinates to world coordinates 
        const worldStartX = (this.startX - centerX) / this.zoomLevel + centerX - this.offsetX;
        const worldStartY = (this.startY - centerY) / this.zoomLevel + centerY - this.offsetY;
        const worldCurrentX = (currentX - centerX) / this.zoomLevel + centerX - this.offsetX;
        const worldCurrentY = (currentY - centerY) / this.zoomLevel + centerY - this.offsetY;
        const worldWidth = worldCurrentX - worldStartX;
        const worldHeight = worldCurrentY - worldStartY;
        
        // Save context for preview drawing
        this.ctx.save();
        
        // Apply transform for preview
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        this.ctx.translate(-centerX, -centerY);
        
        this.ctx.strokeStyle = this.selectedColor;
        this.ctx.lineWidth = this.strokeWidth;
        
        if (this.selectedTool === "rect") {
            this.ctx.strokeRect(
                worldStartX + this.offsetX, 
                worldStartY + this.offsetY, 
                worldWidth, 
                worldHeight
            );   
        } else if (this.selectedTool === "circle") {
            const radius = Math.max(Math.abs(worldWidth), Math.abs(worldHeight)) / 2;
            const worldCenterX = worldStartX + (worldWidth / 2) + this.offsetX;
            const worldCenterY = worldStartY + (worldHeight / 2) + this.offsetY;
            this.ctx.beginPath();
            this.ctx.arc(worldCenterX, worldCenterY, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.closePath();                
        }
        
        // Restore context
        this.ctx.restore();
    }

    sendShapeToServer(shape: Shape) {
        this.socket.send(JSON.stringify({
            type: "draw",
            shape_data: JSON.stringify({
                shape
            }),
            room_id: this.roomId
        }));
    }

    initMouseHandlers() {
        this.canvas.addEventListener("mousedown", this.mouseDownHandler);
        this.canvas.addEventListener("mouseup", this.mouseUpHandler);
        this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
        this.canvas.addEventListener("wheel", this.wheelHandler);
    }

    wheelHandler = (e: WheelEvent) => {
        // Only zoom when Ctrl key is pressed
        if (e.ctrlKey && this.selectedTool === "drag") {
            e.preventDefault();
            
            // Determine zoom direction
            const delta = e.deltaY < 0 ? 1.1 : 0.9;
            
            // Calculate new zoom level
            const newZoom = this.zoomLevel * delta;
            
            // Apply constraints
            if (newZoom >= this.minZoom && newZoom <= this.maxZoom) {
                this.zoomLevel = newZoom;
                this.clearCanvas();
            }
        }
    }

    requestShapesFromServer() {
        console.log("Requesting shapes via WebSocket for room:", this.roomId);
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: "get_shapes",
                room_id: this.roomId
            }));
            console.log("WebSocket shape request sent");
        } else {
            console.warn("WebSocket not ready to request shapes, state:", this.socket.readyState);
            // Try again after a short delay
            setTimeout(() => this.tryWebSocketFallback(), 1000);
        }
    }
    
    tryWebSocketFallback() {
        // Only attempt up to max retries
        if (this.shapeLoadRetryCount >= this.maxShapeLoadRetries) {
            console.warn(`Max retries (${this.maxShapeLoadRetries}) reached for shape loading`);
            return;
        }
        
        this.shapeLoadRetryCount++;
        console.log(`Trying WebSocket fallback for shapes (attempt ${this.shapeLoadRetryCount})`);
        
        if (this.socket.readyState === WebSocket.OPEN) {
            this.requestShapesFromServer();
        } else {
            console.warn("WebSocket not ready for fallback, will retry");
            setTimeout(() => this.tryWebSocketFallback(), 1000);
        }
    }
}
