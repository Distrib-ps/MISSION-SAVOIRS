import { useEffect, useRef, useState } from "react";

interface Props {
  submitting: boolean;
  resetKey: number;
  onSubmit: (base64: string) => void;
}

const COLORS = ["#2D2D3A", "#C4ACF4", "#98E2FD", "#FFB3BA", "#FFDE55", "#B5EAD7", "#F8C291"];
const SIZES = [2, 4, 8, 14];

export default function DrawingCanvas({ submitting, resetKey, onSubmit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [isEraser, setIsEraser] = useState(false);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  /* Setup canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  /* Reset on attempt change */
  useEffect(() => {
    clearCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPos(e);
    /* Dot for single tap */
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pt = lastPointRef.current;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = isEraser ? "#ffffff" : color;
    ctx.fill();
    setHasDrawn(true);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pt = getPos(e);
    ctx.strokeStyle = isEraser ? "#ffffff" : color;
    ctx.lineWidth = isEraser ? size * 2 : size;
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPointRef.current = pt;
  }

  function endDraw() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  }

  function handleSubmit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSubmit(dataUrl);
  }

  return (
    <div className="space-y-4">
      {/* Tools */}
      <div className="bg-white border border-ms-light-gray rounded-2xl p-3 flex flex-wrap items-center gap-3">
        {/* Color palette */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={submitting}
              onClick={() => { setColor(c); setIsEraser(false); }}
              className={`w-8 h-8 rounded-full border-2 transition ${
                !isEraser && color === c ? "border-ms-dark scale-110" : "border-white shadow-sm"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Couleur ${c}`}
            />
          ))}
        </div>

        <div className="w-px h-8 bg-ms-light-gray" />

        {/* Brush sizes */}
        <div className="flex items-center gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={submitting}
              onClick={() => setSize(s)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition ${
                size === s ? "border-ms-lavender bg-ms-lavender-light" : "border-ms-light-gray bg-white hover:border-ms-lavender"
              }`}
              aria-label={`Taille ${s}`}
            >
              <span className="rounded-full bg-ms-dark" style={{ width: s + 2, height: s + 2 }} />
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-ms-light-gray" />

        {/* Eraser */}
        <button
          type="button"
          disabled={submitting}
          onClick={() => setIsEraser((v) => !v)}
          className={`px-3 py-2 rounded-xl border-2 text-sm font-semibold transition flex items-center gap-2 ${
            isEraser ? "bg-ms-yellow-light border-ms-yellow text-ms-dark" : "bg-white border-ms-light-gray text-ms-gray hover:border-ms-lavender"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12l-3 3m0 0l3 3m-3-3h12M3 12l3-3m0 0L3 6m3 3H-9" transform="rotate(45 12 12)" />
          </svg>
          Gomme
        </button>

        {/* Clear */}
        <button
          type="button"
          disabled={submitting}
          onClick={clearCanvas}
          className="ml-auto px-3 py-2 rounded-xl border-2 border-ms-light-gray bg-white hover:border-ms-pink hover:text-ms-pink text-ms-gray text-sm font-semibold transition"
        >
          Tout effacer
        </button>
      </div>

      {/* Canvas */}
      <div className="border-2 border-ms-light-gray rounded-2xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-[400px] touch-none cursor-crosshair block"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
          onPointerLeave={endDraw}
        />
      </div>

      {/* Validate */}
      <button
        type="button"
        disabled={submitting || !hasDrawn}
        onClick={handleSubmit}
        className="w-full py-4 bg-ms-lavender text-white font-bold text-lg rounded-2xl hover:bg-ms-lavender/85 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
      >
        {submitting ? "Envoi..." : hasDrawn ? "Valider mon dessin" : "Dessine d'abord !"}
      </button>
    </div>
  );
}
