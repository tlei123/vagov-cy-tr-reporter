import axios from 'axios';
import { spawnSync } from 'child_process';

import { TestRailOptions, TestRailResult } from './testrail.interface';

export class TestRailAgent {
  private _apiPath = '/index.php?/api/v2/';

  constructor(private options: TestRailOptions) {}

  public reportResults(cyResults: TestRailResult[]) {
    /**
     * To work around a Cypress issue where Mocha exits before async requests
     * finish, we spawn a Node child-process to interact TestRail.
     * see this Cypress issue:
     * https://github.com/cypress-io/cypress/issues/7139#issuecomment-1074747820
     */
    const trOpts = Object.assign(this.options, {
      apiPath: this._apiPath,
    });

    spawnSync('node', [`${__dirname}/testrail-post-results.js`], {
      stdio: 'inherit',
      env: Object.assign(process.env, {
        NODE_TLS_REJECT_UNAUTHORIZED: 1,
        testrail_options: JSON.stringify(trOpts),
        cypress_results: JSON.stringify(cyResults),
      }),
    });
  }
}
