import { ToolType } from "@/lib/constants";
import { useEditorStore } from "@/store/useEditorState";
import { useEffect, useRef } from "react";

type CanvasPoint = {
  x: number;
  y: number;
};

const HIGHLIGHT_COLOR = "rgba(255, 0, 0, 0.4)";

function ImageEditor() {
  const { image, selectedTool, brushSize, setMask } = useEditorStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const startPosRef = useRef<CanvasPoint | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (!image) return;

    let disposed = false;
    const img = new Image();

    img.onload = () => {
      if (disposed) return;

      const canvas = canvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      const previewCanvas = previewCanvasRef.current;
      if (!canvas || !overlayCanvas || !previewCanvas) return;

      imgRef.current = img;

      for (const target of [canvas, overlayCanvas, previewCanvas]) {
        target.width = img.naturalWidth;
        target.height = img.naturalHeight;
      }

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }

      overlayCanvas.getContext("2d")?.clearRect(
        0,
        0,
        overlayCanvas.width,
        overlayCanvas.height,
      );
      previewCanvas.getContext("2d")?.clearRect(
        0,
        0,
        previewCanvas.width,
        previewCanvas.height,
      );

      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = img.naturalWidth;
      maskCanvas.height = img.naturalHeight;
      maskCanvasRef.current = maskCanvas;

      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        maskCtx.fillStyle = "black";
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    };

    img.src = image;

    return () => {
      disposed = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [image]);

  const getPointerPos = (clientX: number, clientY: number): CanvasPoint => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: 0, y: 0 };

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const configureStroke = (
    ctx: CanvasRenderingContext2D,
    operation: GlobalCompositeOperation,
  ) => {
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = operation;
  };

  const strokeMask = (start: CanvasPoint, end: CanvasPoint) => {
    const ctx = maskCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    const isBrush = selectedTool === ToolType.BRUSH;
    const isEraser = selectedTool === ToolType.ERASER;
    if (!isBrush && !isEraser) return;

    configureStroke(ctx, isBrush ? "destination-out" : "source-over");
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  };

  const strokeOverlay = (start: CanvasPoint, end: CanvasPoint) => {
    const ctx = overlayCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    const isBrush = selectedTool === ToolType.BRUSH;
    const isEraser = selectedTool === ToolType.ERASER;
    if (!isBrush && !isEraser) return;

    configureStroke(ctx, isBrush ? "source-over" : "destination-out");
    ctx.strokeStyle = HIGHLIGHT_COLOR;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  };

  const persistMask = () => {
    const maskCanvas = maskCanvasRef.current;
    const imageAtRequest = image;
    if (!maskCanvas || !imageAtRequest) return;

    maskCanvas.toBlob((blob) => {
      if (
        blob &&
        useEditorStore.getState().image === imageAtRequest
      ) {
        setMask(blob);
      }
    }, "image/png");
  };

  const clearRectanglePreview = () => {
    const canvas = previewCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (selectedTool === ToolType.MOVE) return;

    e.preventDefault();
    const pos = getPointerPos(e.clientX, e.clientY);
    startPosRef.current = pos;
    isDrawingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (selectedTool === ToolType.BRUSH || selectedTool === ToolType.ERASER) {
      strokeMask(pos, pos);
      strokeOverlay(pos, pos);
    }
  };

  const drawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !startPosRef.current) return;

    e.preventDefault();

    if (selectedTool === ToolType.BRUSH || selectedTool === ToolType.ERASER) {
      let previous = startPosRef.current;
      const coalesced = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];

      for (const pointerEvent of coalesced) {
        const current = getPointerPos(pointerEvent.clientX, pointerEvent.clientY);
        strokeMask(previous, current);
        strokeOverlay(previous, current);
        previous = current;
      }

      startPosRef.current = previous;
      return;
    }

    if (selectedTool === ToolType.RECTANGLE) {
      const previewCanvas = previewCanvasRef.current;
      const ctx = previewCanvas?.getContext("2d");
      if (!previewCanvas || !ctx) return;

      const current = getPointerPos(e.clientX, e.clientY);
      const start = startPosRef.current;
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      ctx.fillStyle = HIGHLIGHT_COLOR;
      ctx.fillRect(
        start.x,
        start.y,
        current.x - start.x,
        current.y - start.y,
      );
    }
  };

  const endDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (selectedTool === ToolType.RECTANGLE) {
      const start = startPosRef.current;
      if (start) {
        const end = getPointerPos(e.clientX, e.clientY);
        const width = end.x - start.x;
        const height = end.y - start.y;

        if (Math.abs(width) > 0 && Math.abs(height) > 0) {
          const maskCtx = maskCanvasRef.current?.getContext("2d");
          if (maskCtx) {
            maskCtx.globalCompositeOperation = "destination-out";
            maskCtx.fillRect(start.x, start.y, width, height);
            maskCtx.globalCompositeOperation = "source-over";
          }

          const overlayCtx = overlayCanvasRef.current?.getContext("2d");
          if (overlayCtx) {
            overlayCtx.fillStyle = HIGHLIGHT_COLOR;
            overlayCtx.fillRect(start.x, start.y, width, height);
          }
        }
      }

      clearRectanglePreview();
    }

    persistMask();
    startPosRef.current = null;
  };

  const cancelDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    clearRectanglePreview();

    if (selectedTool === ToolType.BRUSH || selectedTool === ToolType.ERASER) {
      persistMask();
    }

    startPosRef.current = null;
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="inline-grid max-w-full max-h-full">
        <canvas
          ref={canvasRef}
          className="col-start-1 row-start-1 max-w-full max-h-full"
        />
        <canvas
          ref={overlayCanvasRef}
          onPointerDown={startDrawing}
          onPointerMove={drawMove}
          onPointerUp={endDrawing}
          onPointerCancel={cancelDrawing}
          aria-label="Image edit mask canvas"
          className="col-start-1 row-start-1 max-w-full max-h-full touch-none"
        />
        <canvas
          ref={previewCanvasRef}
          className="col-start-1 row-start-1 max-w-full max-h-full pointer-events-none"
        />
      </div>
    </div>
  );
}

export default ImageEditor;
