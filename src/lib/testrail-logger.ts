/* eslint-disable @typescript-eslint/no-explicit-any */
import chalk from 'chalk';
import util from 'util';

export class TestRailLogger {
  log(text: string): void {
    console.log(chalk.bold.yellow('[VCTR]', text));
  }

  logObj(text: string, obj: any): void {
    console.log(
      chalk.bold.yellow('[VCTR]', text),
      chalk.bold.yellow(util.inspect(obj, { colors: true, depth: null })),
    );
  }

  success(text: string): void {
    console.log(chalk.bold.green('[VCTR]', text));
  }

  successObj(text: string, obj: any): void {
    console.log(
      chalk.bold.green('[VCTR]', text),
      chalk.bold.green(util.inspect(obj, { colors: true, depth: null })),
    );
  }

  error(text: string): void {
    console.log(chalk.bold.red('[VCTR] ERROR:', text));
  }

  errorObj(text: string, obj: any): void {
    console.log(
      chalk.bold.red('[VCTR]', text),
      chalk.bold.red(util.inspect(obj, { colors: true, depth: null })),
    );
  }

  warn(text: string): void {
    console.log(chalk.bold.keyword('orange')('[VCTR] WARNING:', text));
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
