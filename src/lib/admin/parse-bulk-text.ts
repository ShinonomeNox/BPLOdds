// スプレッドシートからのコピー（タブ区切り）またはカンマ区切りのテキストを
// 行・セル単位に分解する。空行は無視する。
export function parseBulkRows(text: string): string[][] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(/\t|,/).map((cell) => cell.trim()));
}

export interface BulkRowError {
  line: number;
  message: string;
}

export interface BulkImportResult {
  successCount: number;
  errors: BulkRowError[];
}
