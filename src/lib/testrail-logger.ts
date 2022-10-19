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

  error(text: string): void {
    console.log(chalk.bold.red('[VCTR] ERROR:', text));
  }

  warn(text: string): void {
    console.log(chalk.bold.keyword('orange')('[VCTR] WARNING:', text));
  }
}
