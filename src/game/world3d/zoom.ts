/** Camera zoom factor: <1 moves the camera closer, >1 farther away. Shared by the 3D canvas and the HUD buttons. */
export const ZOOM_MIN = 0.45;
export const ZOOM_MAX = 2.8;
export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
