type CsvSerializable = string | number | boolean | null | undefined;

function escapeCsvValue(value: CsvSerializable): string {
  if (value === null || value === undefined) {
    return "";
  }

  const rawValue = String(value);
  const stringValue = /^[=+\-@\t\r]/.test(rawValue) ? `'${rawValue}` : rawValue;

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function serializeRowsToCsv(
  rows: Array<Record<string, CsvSerializable>>,
  columns?: string[]
): string {
  if (rows.length === 0) {
    return columns?.map(escapeCsvValue).join(",") ?? "";
  }

  const headers = columns ?? Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(","))
  ];

  return lines.join("\n");
}

