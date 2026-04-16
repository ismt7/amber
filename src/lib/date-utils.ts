const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
});

export function formatPublishedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
}

export function comparePublishedAt(left?: string, right?: string) {
  const leftTime = left ? new Date(left).getTime() : Number.NEGATIVE_INFINITY;
  const rightTime = right ? new Date(right).getTime() : Number.NEGATIVE_INFINITY;

  return normalizeTime(leftTime) - normalizeTime(rightTime);
}

export function normalizeTime(value: number) {
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}
