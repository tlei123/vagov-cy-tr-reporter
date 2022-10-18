import Mocha from 'mocha';

import { TestRailOptions, TestRailResult, Status } from './testrail.interface';
import { TestRailAgent } from './testrail-agent';
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
  private _trAgent: TestRailAgent;
  private _suiteTitle = '';
  private _suiteTitleLogged = false;
  private _cyCaseIdsLogged = false;
  private _indents: number;
  private _cyCaseIds: number[] = [];
  private _cyResults: TestRailResult[] = [];
  private _trCaseIds: number[] | undefined;
  private _trRunId: number | undefined;
  private _trResults: any[] | undefined;
  private _trRunName: string | undefined;

  constructor(runner: any, options: any) {
    const stats = runner.stats;
    const reporterOpts = options.reporterOptions;

    console.log(
      '[VagovCyTrReporter once-run-begin] _reporterOptions:',
      reporterOpts,
    );
    // exit if reporter options are incomplete/invalid.
    if (!utils.validateReporterOptions(reporterOpts)) {
      throw new Error('reporterOptions are incomplete or invalid!');
    }

    this._reporterOptions = options.reporterOptions;
    this._trAgent = new TestRailAgent(this._reporterOptions);
    this._indents = 0;

    runner
      .once(EVENT_RUN_BEGIN, () => {
        console.log('start');
        // get testrail case IDs
        this._trCaseIds = this._trAgent.fetchCases();
      })
      .on(EVENT_SUITE_BEGIN, (suite: any) => {
        // do NOT make TestRail API-calls here.
        // an existing Mocha bug fires suite-begin event twice.
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
        const caseId = utils.getCaseIdFromTestTitle(testTitle);

        this._cyCaseIds.push(caseId);
        this._cyResults.push({
          case_id: caseId,
          status_id: Status.Passed,
          elapsed: utils.getTrElapsedStringFromMsecs(test.duration),
          comment: `Posted via VagovCyTrReporter.  Cypress test title: ${testTitle}`,
        });
        console.log(`${this.indent()}Pass: ${testTitle}`);
      })
      .on(EVENT_TEST_FAIL, (test: any, err: any) => {
        const testTitle = test.title;
        const caseId = utils.getCaseIdFromTestTitle(testTitle);

        this._cyCaseIds.push(utils.getCaseIdFromTestTitle(testTitle));
        this._cyResults.push({
          case_id: caseId,
          status_id: Status.Failed,
          elapsed: utils.getTrElapsedStringFromMsecs(test.duration),
          comment: `Posted via VagovCyTrReporter.  Cypress test title: ${testTitle}`,
        });
        console.log(
          `${this.indent()}Fail: ${testTitle} - error: ${err.message}`,
        );
      })
      .on(EVENT_SUITE_END, () => {
        // do NOT make TestRail API-calls here.
        // an existing Mocha bug fires suite-end event twice.
        if (!this._cyCaseIdsLogged) {
          console.log(
            '[VagovCyTrReporter on-suite-end] Case IDs extracted from Cypress spec:\n',
            this._cyCaseIds,
          );
          this._cyCaseIdsLogged = true;
        }
        this.decreaseIndent();
      })
      .once(EVENT_RUN_END, () => {
        console.log(`end: ${stats.passes}/${stats.passes + stats.failures} ok`);

        // Check Cypress case IDs against those from TestRail
        if (this._trCaseIds) {
          console.log(
            `[VagovCyTrReporter on-run-end] Case IDs fetched from TestRail:\n`,
            this._cyCaseIds,
          );

          if (utils.matchCaseIdArrays(this._cyCaseIds, this._trCaseIds)) {
            console.log(
              '[VagovCyTrReporter on-run-end] Cypress and TestRail case IDs match.',
            );
          } else {
            console.warn(
              '[VagovCyTrReporter on-run-end] WARNING: Cypress and TestRail case IDs do not match!',
            );
          }

          // create TestRail test run.
          this._trRunId = this._trAgent.createRun(
            this._trCaseIds,
            this._suiteTitle,
          );
          if (this._trRunId) {
            console.log(
              `[VagovCyTrReporter on-run-end] Test run added to TestRail.  Run ID: ${this._trRunId}`,
            );
          }
        }

        // post results to TestRail.
        if (this._cyResults.length) {
          this._trResults = this._trAgent.reportResults(
            this._trRunId as number,
            this._cyResults,
          );
          if (this._trResults) {
            console.log(
              '[VagovCyTrReporter on-run-end] TestRail results posted. Returned data:',
              this._trResults,
            );
          }
          // close TestRail run.
          if (this._trResults) {
            this._trRunName = this._trAgent.closeRun(this._trRunId as number);
            if (this._trRunName) {
              console.log(
                `[VagovCyTrReporter on-run-end] TestRail run closed.  Returned run name: ${this._trRunName}`,
              );
            }
          }
        } else {
          throw new Error('No results from Cypress run!');
        }
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
