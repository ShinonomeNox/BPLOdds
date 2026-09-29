// matches.game_key（'1'〜'21', 'semi1', 'semi2', 'final'）から表示用ラベルを生成する。
export function formatGameLabel(gameKey: string | null): string | null {
  if (!gameKey) return null;
  const num = Number(gameKey);
  if (!Number.isNaN(num)) return `第${num}試合`;
  if (gameKey === "semi1") return "セミファイナル 第1試合";
  if (gameKey === "semi2") return "セミファイナル 第2試合";
  if (gameKey === "final") return "ファイナル";
  return gameKey;
}
