/**
 * One CSV cell: always quoted, and neutralised so spreadsheet apps don't run
 * it as a formula (=, +, -, @, tab, CR). Phone numbers like +2348012345678 stay as they are.
 */
export function csvCell(value: string) {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v) && !/^\+\d+$/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}
