import Mocha from 'mocha';

import { TestRailOptions, TestRailResult, Status } from './testrail.interface';
import { TestRailAgent } from './testrail-agent';
import { TestRailLogger } from './testrail-logger';
import * as utils from './utils';

const { EVENT_RUN_BEGIN, EVENT_RUN_END, EVENT_TEST_FAIL, EVENT_TEST_PASS } =
  Mocha.Runner.constants;

export class VagovCyTrReporter {
  private _trAgent: TestRailAgent;
  private _trLogger: TestRailLogger;

  // Cypress config/spec
  private _cyRptrOpts: TestRailOptions;
  private _cyCaseIds: number[] = [];
  private _cyResults: TestRailResult[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(runner: any, options: any) {
    const stats = runner.stats;

    this._cyRptrOpts = options.reporterOptions;
    this._trAgent = new TestRailAgent(this._cyRptrOpts);
    this._trLogger = new TestRailLogger();

    this._trLogger.log('Using VA.GOV CYPRESS TESTRAIL REPORTER (VCTR) v0.0.7');

    // validate reporterOptions, exit if incomplete/invalid.
    if (!utils.validateReporterOptions(this._cyRptrOpts)) {
      this._trLogger.errorObj(
        'Cypress reporterOptions are incomplete or invalid! Here are the options retrieved (if any):',
        utils.getPwObfuscatedRptrOpts(this._cyRptrOpts),
      );
      process.exit(1);
    } else {
      this._trLogger.logObj(
        '_cyRptrOpts:',
        utils.getPwObfuscatedRptrOpts(this._cyRptrOpts),
      );
    }

    runner
      .once(EVENT_RUN_BEGIN, () => {
        this._trLogger.log('RUN START');
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on(EVENT_TEST_PASS, (test: any) => {
        const title = test.title;
        const durationStr = test.duration
          ? utils.getTrElapsedStringFromMsecs(test.duration)
          : '';
        const caseId = utils.getCaseIdFromTestTitle(title);

        this._cyCaseIds.push(caseId);
        if (durationStr) {
          this._cyResults.push({
            case_id: caseId,
            status_id: Status.Passed,
            elapsed: durationStr,
            comment: `Posted via VagovCyTrReporter.  Cypress test title: ${title}`,
          });
        } else {
          this._cyResults.push({
            case_id: caseId,
            status_id: Status.Passed,
            comment: `Posted via VagovCyTrReporter.  Cypress test title: ${title}`,
          });
        }
        this._trLogger.success(
          `  Pass${durationStr ? ` [${durationStr}]` : ''}: ${title}`,
        );
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on(EVENT_TEST_FAIL, (test: any, err: any) => {
        const title = test.title;
        const durationStr = test.duration
          ? utils.getTrElapsedStringFromMsecs(test.duration)
          : '';
        const caseId = utils.getCaseIdFromTestTitle(title);

        this._cyCaseIds.push(utils.getCaseIdFromTestTitle(title));
        if (durationStr) {
          this._cyResults.push({
            case_id: caseId,
            status_id: Status.Failed,
            elapsed: durationStr,
            comment: `Posted via VagovCyTrReporter.  Cypress test title: ${title}`,
          });
        } else {
          this._cyResults.push({
            case_id: caseId,
            status_id: Status.Failed,
            comment: `Posted via VagovCyTrReporter.  Cypress test title: ${title}`,
          });
        }
        this._trLogger.error(
          `  Fail${durationStr ? ` [${durationStr}]` : ''}: ${title} - error: ${
            err.message
          }`,
        );
      })
      .once(EVENT_RUN_END, () => {
        this._trLogger.log('RUN END');
        this._trLogger.log(
          `Stats: ${stats.passes}/${stats.passes + stats.failures} ok`,
        );
        this._trLogger.log(
          `Case IDs extracted from Cypress spec:\n${this._cyCaseIds.join(
            ', ',
          )}`,
        );

        // report results to TestRail.
        if (this._cyResults.length) {
          this._trAgent.reportResults(this._cyResults);
        } else {
          throw new Error('No results from Cypress run!');
        }
      });
  }
}
