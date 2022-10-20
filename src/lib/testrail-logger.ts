/* eslint-disable @typescript-eslint/no-explicit-any */
import colors from 'colors';
import util from 'util';

export class TestRailLogger {
  log(text: string): void {
    console.log(colors.bold.yellow(`[VCTR] ${text}`));
  }

  logObj(text: string, obj: any): void {
    console.log(
      colors.bold.yellow(`[VCTR] ${text}`),
      colors.bold.yellow(util.inspect(obj, { colors: true, depth: null })),
    );
  }

  success(text: string): void {
    console.log(colors.bold.green(`[VCTR] ${text}`));
  }

  successObj(text: string, obj: any): void {
    console.log(
      colors.bold.green(`[VCTR] ${text}`),
      colors.bold.green(util.inspect(obj, { colors: true, depth: null })),
    );
  }

  error(text: string): void {
    console.log(colors.bold.red(`[VCTR] ERROR: ${text}`));
  }

  errorObj(text: string, obj: any): void {
    console.log(
      colors.bold.red(`[VCTR] ERROR: ${text}`),
      colors.bold.red(util.inspect(obj, { colors: true, depth: null })),
    );
  }

  warn(text: string): void {
    console.log(colors.bold.black.bgYellow(`[VCTR] WARNING: ${text}`));
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
