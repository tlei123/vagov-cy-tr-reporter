export function getIdFromTestRailCase(c: any): number {
  return c.id;
}

export function getCaseIdFromTestTitle(title: string): number {
  // extracts and returns TestRail Case ID integer from Mocha test title string.
  const regex = /\bC(\d+)\b/g;
  // eslint-disable-next-line prefer-const
  let match;
  let id = 0;

  while ((match = regex.exec(title)) !== null) {
    id = parseInt(match[1]);
  }

  return id;
}

export function getTrElapsedStringFromMsecs(ms: number): string {
  const min = Math.floor(ms / 1000 / 60);
  const sec = Math.round(ms / 1000) % 60;

  return `${min ? min + 'm ' : ''}${sec}s`;
}
