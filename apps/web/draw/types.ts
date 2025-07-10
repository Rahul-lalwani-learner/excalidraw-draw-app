export type Tool = "circle" | "rect" | "pencil" | "text";

export type Shape = {
    type: "rect";
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
    strokeWidth?: number;
} | {
    type: "circle";
    centerX: number;
    centerY: number;
    radius: number;
    color?: string;
    strokeWidth?: number;
} | {
    type: "pencil";
    points: {x: number, y: number}[];
    color?: string;
    strokeWidth?: number;
} | {
    type: "text";
    x: number;
    y: number;
    text: string;
    fontSize?: number;
    color?: string;
};
