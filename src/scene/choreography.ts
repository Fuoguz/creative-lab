/** Reversible windows: each mechanism waits for the physical restraint before it. */
export function mechanismProgress(progress: number, stage: number) {
  const windows = [
    [0, 0.2],
    [0.18, 0.64],
    [0.42, 0.84],
    [0.66, 1],
  ];
  const [start, end] = windows[stage] ?? windows[3];
  const x = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  return stage === 0 ? 1 - Math.pow(1 - x, 3) : x * x * (3 - 2 * x);
}
export function mechanismStage(progress: number) {
  if (progress <= 0.001) return 'SEALED / OBSERVE';
  if (progress >= 0.999) return 'RIFT EXPOSED / ENTER';
  return progress < 0.18
    ? '01 / RELEASE THE LOCKS'
    : progress < 0.46
      ? '02 / OPEN THE ARMOUR'
      : progress < 0.8
        ? '03 / REVEAL THE TRANSMISSION'
        : '04 / EXPOSE THE RIFT';
}
