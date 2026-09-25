const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 2026/11/25以降は毎週水曜日、2027/1/11以降は毎週月曜日が「試合の日」
// （日本時間基準で判定する）
export function isMatchDay(date: Date = new Date()): boolean {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  const dateOnly = Date.UTC(
    jst.getUTCFullYear(),
    jst.getUTCMonth(),
    jst.getUTCDate(),
  );
  const dayOfWeek = jst.getUTCDay(); // 0=日, 1=月, 3=水

  const mondayPhaseStart = Date.UTC(2027, 0, 11);
  const wednesdayPhaseStart = Date.UTC(2026, 10, 25);

  if (dateOnly >= mondayPhaseStart) {
    return dayOfWeek === 1;
  }
  if (dateOnly >= wednesdayPhaseStart) {
    return dayOfWeek === 3;
  }
  return false;
}
