const normalize = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
function distance(a: string, b: string) {
  let prior = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 0; i < a.length; i++) {
    const row = [i + 1];
    for (let j = 0; j < b.length; j++)
      row.push(
        Math.min(
          row[j] + 1,
          prior[j + 1] + 1,
          prior[j] + Number(a[i] !== b[j]),
        ),
      );
    prior = row;
  }
  return prior[b.length];
}
export function matchPlayer(
  name: string,
  players: { id: string; full_name: string }[],
) {
  const query = normalize(name);
  if (query.length < 3) return null;
  const ranked = players
    .map((player) => {
      const parts = normalize(player.full_name).split(" ");
      const swapped = [...parts].reverse().join(" ");
      const initial = parts.length > 1 ? parts.at(-1) + " " + parts[0][0] : "";
      return {
        id: player.id,
        score: Math.min(
          ...[parts.join(" "), swapped, initial]
            .filter(Boolean)
            .map(
              (candidate) =>
                distance(query, candidate) /
                Math.max(query.length, candidate.length),
            ),
        ),
      };
    })
    .sort((a, b) => a.score - b.score);
  return ranked[0] &&
    ranked[0].score <= 0.28 &&
    (!ranked[1] || ranked[1].score - ranked[0].score > 0.09)
    ? ranked[0].id
    : null;
}
