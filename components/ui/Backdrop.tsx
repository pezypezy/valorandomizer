/** Full-viewport animated backdrop: grid, brand glow, and scanlines. */
export function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[var(--color-bg-deep)]" />
      <div className="bg-grid absolute inset-x-0 top-0 h-[75vh]" />
      <div
        className="absolute left-1/2 top-[-15%] h-[55vh] w-[55vh] -translate-x-1/2 rounded-full blur-[2px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,70,85,0.20), transparent 62%)",
        }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] h-[45vh] w-[45vh] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(54,214,176,0.10), transparent 65%)",
        }}
      />
      <div className="scanlines absolute inset-0" />
    </div>
  );
}
