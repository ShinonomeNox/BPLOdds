const SPECIAL_KEY_ORDER: Record<string, number> = {
  semi1: 10000,
  semi2: 10001,
  final: 10002,
};

// '1'〜'21'は数値順、'semi1'/'semi2'/'final'はその後ろに続く順で並べる
export function scheduleSortKey(gameKey: string): number {
  const n = Number(gameKey);
  if (!Number.isNaN(n)) return n;
  return SPECIAL_KEY_ORDER[gameKey] ?? 99999;
}
