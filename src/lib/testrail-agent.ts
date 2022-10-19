import axios from 'axios';
import deasync from 'deasync';

import { TestRailOptions, TestRailResult } from './testrail.interface';
import { getDateTimeString } from './utils';

export class TestRailAgent {
  private _host: string | undefined;
  private _apiPath = '/index.php?/api/v2/';
  private _runId: number | undefined;
  private _caseIds = [];

  constructor(private options: TestRailOptions) {
    this._host = options.host;
  }

  /**
   * To work around a Cypress issue where Mocha exits before async requests
   * finish, we use the deasync library to ensure our axios promises
   * actually complete. For more information, see:
   * https://github.com/cypress-io/cypress/issues/7139
   * @param promise A `finally` condition will be appended to this promise, enabling a deasync loop
   */
  private _makeSync(promise: any) {
    let done = false;
    let result = undefined;
    (async () => (result = await promise.finally(() => (done = true))))();
    deasync.loopWhile(() => !done);
    return result;
  }

  public fetchCases() {
    // gets test-cases from TestRail based on project, suite, & group IDs.
    return this._makeSync(
      axios({
        method: 'get',
        url: `${this._host}${this._apiPath}get_cases/${this.options.projectId}&suite_id=${this.options.suiteId}&section_id=${this.options.groupId}`,
        headers: { 'Content-Type': 'application/json' },
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
      })
        .then((response) => {
          this._caseIds = response.data.cases.map((item: any) => item.id);
          return this._caseIds as number[];
        })
        .catch((error) => {
          throw new Error(`get_cases API-call FAILED: ${error.message}`);
        }),
    );
  }

  public createRun(caseIds: number[]) {
    // adds test-run to TestRail, returns run ID.

    return this._makeSync(
      axios({
        method: 'post',
        url: `${this._host}${this._apiPath}add_run/${this.options.projectId}`,
        headers: { 'Content-Type': 'application/json' },
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
        data: JSON.stringify({
          suite_id: this.options.suiteId,
          name: `${this.options.runName} ${getDateTimeString()}`,
          description: 'Local Cypress E2E spec run.',
          include_all: this.options.includeAllInTestRun,
          case_ids: caseIds,
        }),
      })
        .then((response) => {
          this._runId = response.data.id;
          return this._runId as number;
        })
        .catch((error) => {
          throw new Error(`add_run API-call FAILED: ${error.message}`);
        }),
    );
  }

  public reportResults(runId: number, cyResults: TestRailResult[]) {
    // posts test-results to TestRail.
    return this._makeSync(
      axios({
        method: 'post',
        url: `${this._host}${this._apiPath}add_results_for_cases/${runId}`,
        headers: { 'Content-Type': 'application/json' },
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
        data: JSON.stringify({ results: cyResults }),
      })
        .then((response) => {
          return response.data;
        })
        .catch((error) => {
          throw new Error(
            `add_results_for_cases API-call FAILED: ${error.message}`,
          );
        }),
    );
  }

  public closeRun(runId: number) {
    return this._makeSync(
      axios({
        method: 'post',
        url: `${this._host}${this._apiPath}close_run/${runId}`,
        headers: { 'Content-Type': 'application/json' },
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
      })
        .then((response) => {
          return response.data.name;
        })
        .catch((error) => {
          throw new Error(`close_run API-call FAILED: ${error.message}`);
        }),
    );
  }
}
