export function startLoop(update, render, targetFps = 60) {
    const frameDuration = 1000 / targetFps;
    let lastTime = performance.now();
    let accumulator = 0;

    function tick(now) {
        const delta = now - lastTime;
        lastTime = now;
        accumulator += delta;

        while (accumulator >= frameDuration) {
            update(frameDuration / 1000); // deltatime in seconds
            accumulator -= frameDuration;
        }

        render();
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}
