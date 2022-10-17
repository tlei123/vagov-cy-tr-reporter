import Mocha from 'mocha';

import { TestRailOptions } from './testrail.interface';
import * as utils from './utils';

const {
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
} = Mocha.Runner.constants;

export class VagovCyTrReporter {
  private _reporterOptions: TestRailOptions;
  private _suiteTitle = '';
  private _suiteTitleLogged = false;
  private _indents: number;
  private _cyCaseIds: number[] = [];
  private _cyCaseIdsLogged = false;

  constructor(runner: any, options: any) {
    this._reporterOptions = options.reporterOptions;

    this._indents = 0;
    const stats = runner.stats;

    runner
      .once(EVENT_RUN_BEGIN, () => {
        console.log('start');
        console.log(
          '[VagovCyTrReporter once-run-begin] _reporterOptions:',
          this._reporterOptions,
        );
      })
      .on(EVENT_SUITE_BEGIN, (suite: any) => {
        this.increaseIndent();
        if (suite.title) {
          this._suiteTitle = suite.title;
          if (!this._suiteTitleLogged) {
            console.log(
              `[VagovCyTrReporter on-suite-begin] Suite title: ${this._suiteTitle}`,
            );
            this._suiteTitleLogged = true;
          }
        }
      })
      .on(EVENT_TEST_PASS, (test: any) => {
        const testTitle = test.title;

        this._cyCaseIds.push(utils.getCaseIdFromTestTitle(testTitle));
        console.log(`${this.indent()}Pass: ${testTitle}`);
      })
      .on(EVENT_TEST_FAIL, (test: any, err: any) => {
        const testTitle = test.title;

        this._cyCaseIds.push(utils.getCaseIdFromTestTitle(testTitle));
        console.log(
          `${this.indent()}Fail: ${testTitle} - error: ${err.message}`,
        );
      })
      .on(EVENT_SUITE_END, () => {
        if (!this._cyCaseIdsLogged) {
          console.log(
            `[VagovCyTrReporter on-suite-end] Case IDs extracted from spec: ${this._cyCaseIds.join(
              ', ',
            )}`,
          );
          this._cyCaseIdsLogged = true;
        }
        this.decreaseIndent();
      })
      .once(EVENT_RUN_END, () => {
        console.log(`end: ${stats.passes}/${stats.passes + stats.failures} ok`);
      });
  }

  indent() {
    return Array(this._indents).join('  ');
  }

  increaseIndent() {
    this._indents++;
  }

  decreaseIndent() {
    this._indents--;
  }
}
