import { TestRailOptions } from './testrail.interface';

function _getTimeZoneAcronym(timeZoneStr: string): string {
  /* eslint-disable prettier/prettier */
  const abbrevs = {
    Time: 'T',
    Standard: 'S',
    Daylight: 'D',
    Hawaii: 'H',
    Pacific: 'P',
    Mountain: 'M',
    Central: 'C',
    Eastern: 'E',
  };
  /* eslint-enable prettier/prettier */
  const timeZoneStrArr = timeZoneStr.replace(/[()]/, '').split(' ');
  type ObjKey = keyof typeof abbrevs;

  const zoneKey = timeZoneStrArr[0] as ObjKey;
  const dsKey = timeZoneStrArr[1] as ObjKey;

  return `${abbrevs[zoneKey]}${abbrevs[dsKey]}T`;
}

export function getPwObfuscatedRptrOpts(
  rptrOpts: TestRailOptions,
): TestRailOptions {
  // returns reporter-options object with password value obfuscated.
  return Object.assign({}, rptrOpts, { password: '[obfuscated]' });
}

export function validateReporterOptions(rptrOpts: TestRailOptions): boolean {
  // checks reporter-options.  returns true if complete & valid.
  const { username, password, projectId, suiteId, groupId, runName } = rptrOpts;
  const stringIsGood = (prop: string): boolean => {
    return prop !== undefined && prop.length > 0;
  };
  const numberIsGood = (prop: number): boolean => {
    return prop !== undefined && prop > 0;
  };

  return (
    stringIsGood(username) &&
    stringIsGood(password) &&
    numberIsGood(projectId) &&
    numberIsGood(suiteId) &&
    numberIsGood(groupId) &&
    stringIsGood(runName)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export function getDateTimeString(): string {
  const zNow = new Date();
  const localDateStr = zNow.toLocaleDateString();
  const localTimeStr = zNow.toLocaleTimeString();
  const timeStr = zNow.toTimeString();
  const localTimeZoneStr = timeStr.substring(timeStr.indexOf('('));

  return `${localDateStr} ${localTimeStr} ${_getTimeZoneAcronym(
    localTimeZoneStr,
  )}`;
}
