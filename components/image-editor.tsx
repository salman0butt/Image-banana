import { ToolType } from "@/lib/constants";
import { useEditorStore } from "@/store/useEditorState"
import { Point } from "motion/react";
import NextImage from "next/image"
import { useCallback, useEffect, useRef } from "react";

function ImageEditor() {
    const { image, selectedTool } = useEditorStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const startPosRef = useRef<Point | null>(null);

    const draw = useCallback(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx || !imgRef.current) return;

        ctx.clearRect(
            0,
            0,
            canvasRef.current?.width,
            canvasRef.current?.height
        )

        ctx.drawImage(imgRef.current, 0, 0)

    }, [])

    useEffect(() => {
        if (!image) return;

        const img = new Image();
        img.src = image;

        img.onload = () => {
            imgRef.current = img;
            if (!canvasRef.current) return;

            canvasRef.current.width = img.naturalWidth;
            canvasRef.current.height = img.naturalHeight;


            draw();
        }

    }, [image, draw, canvasRef])

    const startDrawing = (e: React.PointerEvent) => {
        if (selectedTool === ToolType.MOVE) return;
        if (e.pointerType !== 'mouse') return;

        e.preventDefault();

        const pos = getPointerPos(e);
        startPosRef?.current = pos;

        if (!canvasRef.current) return { x: 0, y: 0 };

        const rect = canvasRef.current.getBoundingClientRect();

        const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
        const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);

        return { x, y }

    }

    const getPointerPos = (e: React.PointerEvent) => {

    }



    return (
        <div className="w-full h-full flex items-center justify-center">
            <canvas
                onPointerDown={startDrawing}
                ref={canvasRef}
                className="max-w-full max-h-full"
            />
        </div>
    )
}

export default ImageEditor
