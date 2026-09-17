// 同着（dead heat）を考慮した3連単の正解組み合わせ判定（DESIGN.md参照）
// JRA同着ルールをベースに「同順位グループ内はどの並びも正解」を総当たりで展開する。

export interface RankedParticipant {
  id: string;
  rank: number;
}

function groupByRank(participants: readonly RankedParticipant[]): string[][] {
  const rankToIds = new Map<number, string[]>();
  for (const participant of participants) {
    const ids = rankToIds.get(participant.rank) ?? [];
    ids.push(participant.id);
    rankToIds.set(participant.rank, ids);
  }
  return [...rankToIds.entries()]
    .sort(([rankA], [rankB]) => rankA - rankB)
    .map(([, ids]) => ids);
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) {
    return [items.slice()];
  }
  return items.flatMap((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    return permutations(rest).map((perm) => [item, ...perm]);
  });
}

function cartesianProductOfPermutations(
  groups: readonly string[][],
): string[][] {
  return groups
    .map(permutations)
    .reduce<string[][]>(
      (orderings, groupPerms) =>
        orderings.flatMap((prefix) =>
          groupPerms.map((perm) => [...prefix, ...perm]),
        ),
      [[]],
    );
}

export function getWinningTrifectas(
  participants: readonly RankedParticipant[],
): string[] {
  const groups = groupByRank(participants);
  const fullOrderings = cartesianProductOfPermutations(groups);
  const winningTriples = new Set(
    fullOrderings.map((order) => order.slice(0, 3).join(",")),
  );
  return [...winningTriples];
}
