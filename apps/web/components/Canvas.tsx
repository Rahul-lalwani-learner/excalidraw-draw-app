import { useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import { Circle, Pencil, RectangleHorizontal, Type, ChevronLeft, MessageCircle } from "lucide-react";
import { Game } from "../draw/Game";
import { Tool } from "../draw/types";

interface CanvasProps {
    roomId: string;
    socket: WebSocket;
    onBack: () => void;
    isConnected: boolean;
    onToggleChat: () => void;
    roomName?: string;
}

export function Canvas({ roomId, socket, onBack, isConnected, onToggleChat, roomName }: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [game, setGame] = useState<Game | null>(null);
    const [selectedTool, setSelectedTool] = useState<Tool>("circle");
    const [selectedColor, setSelectedColor] = useState("#FFFFFF");
    const [strokeWidth, setStrokeWidth] = useState(2);
    
    // Handle tool change
    useEffect(() => {
        if (game) {
            game.setTool(selectedTool);
        }
    }, [selectedTool, game]);
    
    // Handle color change
    useEffect(() => {
        if (game) {
            game.setColor(selectedColor);
        }
    }, [selectedColor, game]);
    
    // Handle stroke width change
    useEffect(() => {
        if (game) {
            game.setStrokeWidth(strokeWidth);
        }
    }, [strokeWidth, game]);

    // Initialize game
    useEffect(() => {
        if (canvasRef.current && socket) {
            const g = new Game(canvasRef.current, roomId, socket);
            setGame(g);

            const handleResize = () => {
                if (canvasRef.current) {
                    canvasRef.current.width = window.innerWidth;
                    canvasRef.current.height = window.innerHeight;
                    g.clearCanvas();
                }
            };

            window.addEventListener('resize', handleResize);

            return () => {
                g.destroy();
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [canvasRef, roomId, socket]);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-gray-900">
            <canvas 
                ref={canvasRef} 
                width={window.innerWidth} 
                height={window.innerHeight}
                className="absolute inset-0"
            />
            
            {/* Top toolbar */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 p-2 rounded-lg shadow-lg flex items-center space-x-3 z-10">
                <IconButton 
                    onClick={() => setSelectedTool("pencil")}
                    activated={selectedTool === "pencil"}
                    icon={<Pencil size={20} />}
                />
                <IconButton 
                    onClick={() => setSelectedTool("rect")} 
                    activated={selectedTool === "rect"} 
                    icon={<RectangleHorizontal size={20} />} 
                />
                <IconButton 
                    onClick={() => setSelectedTool("circle")} 
                    activated={selectedTool === "circle"} 
                    icon={<Circle size={20} />}
                />
                <IconButton 
                    onClick={() => setSelectedTool("text")} 
                    activated={selectedTool === "text"} 
                    icon={<Type size={20} />}
                />
                
                {/* Color picker */}
                <div className="flex items-center space-x-2">
                    <input 
                        type="color" 
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
                    />
                </div>
                
                {/* Stroke width */}
                <div className="flex items-center space-x-2">
                    <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                        className="w-24"
                    />
                </div>
            </div>
            
            {/* Back button and room info */}
            <div className="absolute top-4 left-4 z-10 flex items-center">
                <IconButton 
                    onClick={onBack}
                    icon={<ChevronLeft size={20} />}
                />
                {roomName && (
                    <div className="ml-2 px-3 py-1 bg-gray-800 rounded-md">
                        <span className="text-white font-medium">{roomName}</span>
                    </div>
                )}
            </div>
            
            {/* Connection status */}
            <div className="absolute top-4 right-4 z-10 flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-white">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            
            {/* Chat toggle button */}
            <div className="absolute bottom-4 right-4 z-10">
                <IconButton 
                    onClick={onToggleChat}
                    icon={<MessageCircle size={24} />}
                />
            </div>
        </div>
    );
}
