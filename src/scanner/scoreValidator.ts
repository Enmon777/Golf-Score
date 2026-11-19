export function summarize(values: (number | null)[], pars: (number | null)[]) {
  const sum = (scores: (number | null)[]) =>
    scores.length && scores.every(validStroke)
      ? scores.reduce<number>((total, score) => total + Number(score), 0)
      : null;
  const total = sum(values);
  return {
    front: sum(values.slice(0, 9)),
    back: sum(values.slice(9)),
    total,
    relative:
      total !== null &&
      pars.length === values.length &&
      pars.every((value) => value !== null)
        ? total - pars.reduce<number>((count, par) => count + Number(par), 0)
        : null,
  };
}
export function validStroke(value: number | null) {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= 30;
}
export function relativeLabel(value: number | null) {
  return value === null
    ? "—"
    : value === 0
      ? "E"
      : value > 0
        ? "+" + value
        : String(value);
}
