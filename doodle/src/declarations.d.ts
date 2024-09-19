declare module 'canvas-confetti' {
  interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    ticks?: number;
    origin?: {
      x?: number;
      y?: number;
    };
    colors?: string[];
    disableForReducedMotion?: boolean;
    scalar?: number;
  }

  function confetti(options?: ConfettiOptions): void;

  export default confetti;
}
