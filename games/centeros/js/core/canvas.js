export function createCanvasContext(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) throw new Error(`Canvas '${canvasId}' not found`);

    const ctx = canvas.getContext("2d");

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener("resize", resize);
    resize();

    return { canvas, ctx };
}
