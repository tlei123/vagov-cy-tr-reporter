import Mocha from 'mocha';
import chalk from 'chalk';

import { TestRailOptions, TestRailResult, Status } from './testrail.interface';
import { TestRailAgent } from './testrail-agent';
import { TestRailLogger } from './testrail-logger';
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
  private _indents: number;
  private _trAgent: TestRailAgent;
  private _trLogger: TestRailLogger;

  // Cypress config/spec
  private _cyRptrOpts: TestRailOptions;
  private _cySuiteTitle = '';
  private _cySuiteTitleLogged = false;
  private _cyCaseIdsLogged = false;
  private _cyCaseIds: number[] = [];
  private _cyResults: TestRailResult[] = [];

  // incoming from TestRail
  private _trCaseIds: number[] | undefined;
  private _trRunId: number | undefined;
  private _trResults: any[] | undefined;
  private _trRunName: string | undefined;

  constructor(runner: any, options: any) {
    const stats = runner.stats;
    const reporterOpts = options.reporterOptions;
    // exit if reporter options are incomplete/invalid.
    if (!utils.validateReporterOptions(reporterOpts)) {
      throw new Error('reporterOptions are incomplete or invalid!');
    }

    this._indents = 0;
    this._cyRptrOpts = options.reporterOptions;
    this._trAgent = new TestRailAgent(this._cyRptrOpts);
    this._trLogger = new TestRailLogger();

    console.log(
      chalk.bold.yellow('Using VA.GOV CYPRESS TESTRAIL REPORTER (VCTR)'),
    );
    this._trLogger.logObj('_cyRptrOpts:', this._cyRptrOpts);

    runner
      .once(EVENT_RUN_BEGIN, () => {
        this._trLogger.log('RUN START');
        // get testrail case IDs
        this._trCaseIds = this._trAgent.fetchCases();
      })
      .on(EVENT_SUITE_BEGIN, (suite: any) => {
        // do NOT make TestRail API-calls here.
        // an existing Mocha bug fires EVENT_SUITE_BEGIN event twice.
        this.increaseIndent();
        if (suite.title) {
          this._trLogger.log('SUITE START');
          this._cySuiteTitle = suite.title;
          if (!this._cySuiteTitleLogged) {
            this._trLogger.log(`Suite title: ${this._cySuiteTitle}`);
            this._cySuiteTitleLogged = true;
          }
        }
      })
      .on(EVENT_TEST_PASS, (test: any) => {
        const title = test.title;
        const duration = test.duration;
        const caseId = utils.getCaseIdFromTestTitle(title);

        this._cyCaseIds.push(caseId);
        this._cyResults.push({
          case_id: caseId,
          status_id: Status.Passed,
          elapsed: utils.getTrElapsedStringFromMsecs(duration),
          comment: `Posted via VagovCyTrReporter.  Cypress test title: ${title}`,
        });
        this._trLogger.success(
          `${this.indent()}Pass [${duration}ms]: ${title}`,
        );
      })
      .on(EVENT_TEST_FAIL, (test: any, err: any) => {
        const title = test.title;
        const duration = test.duration;
        const caseId = utils.getCaseIdFromTestTitle(title);

        this._cyCaseIds.push(utils.getCaseIdFromTestTitle(title));
        this._cyResults.push({
          case_id: caseId,
          status_id: Status.Failed,
          elapsed: utils.getTrElapsedStringFromMsecs(test.duration),
          comment: `Posted via VagovCyTrReporter.  Cypress test title: ${title}`,
        });
        this._trLogger.error(
          `${this.indent()}Fail [${duration}ms]: ${title} - error: ${
            err.message
          }`,
        );
      })
      .on(EVENT_SUITE_END, () => {
        // do NOT make TestRail API-calls here.
        // an existing Mocha bug fires EVENT_SUITE_END event twice.
        if (!this._cyCaseIdsLogged) {
          this._trLogger.log('SUITE END');
          this._trLogger.log('Case IDs extracted from Cypress spec:');
          this._trLogger.log(`${this._cyCaseIds.join(', ')}`);
          this._cyCaseIdsLogged = true;
        }
        this.decreaseIndent();
      })
      .once(EVENT_RUN_END, () => {
        console.log(chalk.bold.yellow('RUN END'));
        this._trLogger.log(
          `Stats: ${stats.passes}/${stats.passes + stats.failures} ok`,
        );

        // Check Cypress case IDs against those from TestRail
        if (this._trCaseIds) {
          this._trLogger.log('Case IDs fetched from TestRail:');
          console.log(`${this._cyCaseIds.join(', ')}`);

          if (utils.matchCaseIdArrays(this._cyCaseIds, this._trCaseIds)) {
            this._trLogger.success('Cypress and TestRail case IDs match.');
          } else {
            this._trLogger.warn(
              'WARNING: Cypress and TestRail case IDs do not match!',
            );
          }

          // create TestRail test run.
          this._trRunId = this._trAgent.createRun(
            this._trCaseIds,
            this._cySuiteTitle,
          );
          if (this._trRunId) {
            this._trLogger.success(
              'Test run added to TestRail.  Run ID returned: ',
            );
            console.log(`${this._trRunId}`);
          } else {
            throw new Error('TestRail run ID not received.');
          }
        }

        // post results to TestRail.
        if (this._cyResults.length) {
          this._trResults = this._trAgent.reportResults(
            this._trRunId as number,
            this._cyResults,
          );
          if (this._trResults) {
            this._trLogger.success(
              'TestRail results posted. Results data returned:',
            );
            console.log(this._trResults);
          } else {
            throw new Error('No TestRail results received.');
          }
          // close TestRail run.
          if (this._trResults) {
            this._trRunName = this._trAgent.closeRun(this._trRunId as number);
            if (this._trRunName) {
              console.log(
                chalk.bold.green('TestRail run closed.  Run name returned: '),
                `${this._trRunName}`,
              );
              this._trLogger.success(
                `Run should be viewable at:\n${this._cyRptrOpts.host}index.php?/runs/view/${this._trRunId}`,
              );
            } else {
              throw new Error('TestRail run name not received.');
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
