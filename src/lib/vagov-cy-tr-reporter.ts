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
  private _trAgent: TestRailAgent;
  private _trLogger: TestRailLogger;

  // Cypress config/spec
  private _cyRptrOpts: TestRailOptions;
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

    this._cyRptrOpts = options.reporterOptions;
    this._trAgent = new TestRailAgent(this._cyRptrOpts);
    this._trLogger = new TestRailLogger();

    console.log(
      chalk.bold.yellow('Using VA.GOV CYPRESS TESTRAIL REPORTER (VCTR)'),
    );
    this._trLogger.logObj(
      '_cyRptrOpts:',
      Object.assign({}, this._cyRptrOpts, { password: '[obfuscated]' }),
    );

    runner
      .once(EVENT_RUN_BEGIN, () => {
        this._trLogger.log('RUN START');
        // get testrail case IDs
        this._trCaseIds = this._trAgent.fetchCases();
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
        this._trLogger.success(`  Pass [${duration}ms]: ${title}`);
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
          `  Fail [${duration}ms]: ${title} - error: ${err.message}`,
        );
      })
      .once(EVENT_RUN_END, () => {
        this._trLogger.log('RUN END');
        this._trLogger.log(
          `Stats: ${stats.passes}/${stats.passes + stats.failures} ok`,
        );
        this._trLogger.log('\nCase IDs extracted from Cypress spec:');
        console.log(chalk.bold.yellow(`${this._cyCaseIds.join(', ')}`));
        // Check Cypress case IDs against those from TestRail
        if (this._trCaseIds) {
          this._trLogger.log('Case IDs fetched from TestRail:');
          console.log(`${this._cyCaseIds.join(', ')}`);

          if (this._cyCaseIds.length !== this._trCaseIds.length) {
            this._trLogger.warn(
              'WARNING: Case-ID counts mismatch between Cypress spec and TestRail section!',
            );
          }

          // create TestRail test run.
          this._trRunId = this._trAgent.createRun(this._trCaseIds);
          if (this._trRunId) {
            this._trLogger.success(
              'TEST RUN ADDED to TestRail.  Run ID returned: ',
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
              'TEST RESULTS POSTED to TestRail. Results data returned:',
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
}
