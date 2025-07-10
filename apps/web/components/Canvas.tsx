import { useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import { Circle, Pencil, RectangleHorizontal, Type, ChevronLeft, MessageCircle, Move } from "lucide-react";
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
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 p-2 rounded-lg shadow-lg z-10
                flex flex-col sm:flex-row items-center
                max-w-[90vw] sm:max-w-none overflow-x-auto
                space-y-2 sm:space-y-0 sm:space-x-3">
                {/* Drawing tools in a row - these stay in a row even on mobile */}
                <div className="flex items-center space-x-2">
                    <IconButton 
                        onClick={() => setSelectedTool("pencil")}
                        activated={selectedTool === "pencil"}
                        icon={<Pencil size={18} />}
                    />
                    <IconButton 
                        onClick={() => setSelectedTool("rect")} 
                        activated={selectedTool === "rect"} 
                        icon={<RectangleHorizontal size={18} />} 
                    />
                    <IconButton 
                        onClick={() => setSelectedTool("circle")} 
                        activated={selectedTool === "circle"} 
                        icon={<Circle size={18} />}
                    />
                    <IconButton 
                        onClick={() => setSelectedTool("text")} 
                        activated={selectedTool === "text"} 
                        icon={<Type size={18} />}
                    />
                    <IconButton 
                        onClick={() => setSelectedTool("drag")} 
                        activated={selectedTool === "drag"} 
                        icon={<Move size={18} />}
                    />
                </div>
                
                {/* Color and stroke controls */}
                <div className="flex items-center space-x-2">
                    {/* Color picker */}
                    <div className="flex items-center">
                        <input 
                            type="color" 
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded cursor-pointer"
                        />
                    </div>
                    
                    {/* Stroke width */}
                    <div className="flex items-center">
                        <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={strokeWidth}
                            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                            className="w-20 sm:w-24"
                        />
                    </div>
                </div>
            </div>
            
            {/* Back button and room info */}
            <div className="absolute bottom-4 sm:bottom-auto sm:top-4 left-4 z-10 flex items-center max-w-[40%] sm:max-w-[30%]">
                <IconButton 
                    onClick={onBack}
                    icon={<ChevronLeft size={16} className="sm:w-5 sm:h-5" />}
                />
                {roomName && (
                    <div className="ml-2 px-2 sm:px-3 py-1 bg-gray-800 rounded-md">
                        <span className="text-white font-medium text-xs sm:text-sm truncate block max-w-[100px] sm:max-w-[200px]">{roomName}</span>
                    </div>
                )}
            </div>
            
            {/* Connection status */}
            <div className="absolute top-4 right-4 z-10 flex items-center">
                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1 sm:mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs sm:text-sm text-white hidden sm:inline">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            
            {/* Chat toggle button */}
            <div className="absolute bottom-4 right-4 z-10">
                <IconButton 
                    onClick={onToggleChat}
                    icon={<MessageCircle size={20} className="sm:w-6 sm:h-6" />}
                />
            </div>
        </div>
    );
}
