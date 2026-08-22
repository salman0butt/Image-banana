import { useEditorStore } from "@/store/useEditorState"
import NextImage from "next/image"
import { useCallback, useEffect, useRef } from "react";

function ImageEditor() {
    const { image } = useEditorStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const draw = useCallback(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        if (!image) return;
        const img = new Image()
        img.src = image;

        img.onload = () => {
            if(!canvasRef.current) return;
            canvasRef.current.width = img.naturalWidth;
            canvasRef.current.height = img.naturalHeight;

            ctx.clearRect(
                0,
                0,
                canvasRef.current?.width,
                canvasRef.current?.height
            )

        }


    }, [image])

    useEffect(() => {
        if (!image) return;

        const img = new Image();
        img.src = image;

        img.onload = () => {
            draw();
        }

    }, [image, draw])


    return (
        <div className="w-full h-full flex items-center justify-center">
            <canvas
                ref={canvasRef}
                className="border border-red-400 max-w-full max-h-full"
            />

            <NextImage
                width="500"
                height="500"
                src={image as string}
                alt=""
            />
        </div>
    )
}

export default ImageEditor
