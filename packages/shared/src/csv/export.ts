type CsvSerializable = string | number | boolean | null | undefined;

function escapeCsvValue(value: CsvSerializable): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function serializeRowsToCsv(
  rows: Array<Record<string, CsvSerializable>>,
  columns?: string[]
): string {
  if (rows.length === 0) {
    return "";
  }

  const headers = columns ?? Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(","))
  ];

  return lines.join("\n");
}

