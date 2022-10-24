/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

import { TestRailResult } from './testrail.interface';
import { TestRailLogger } from './testrail-logger';
import { getDateTimeString } from './utils';

const trOptions = JSON.parse(process.env.testrail_options as string);
const cyResults = JSON.parse(process.env.cypress_results as string);
const cyCaseIds = cyResults.map((result: TestRailResult) => result.case_id);
const trLogger = new TestRailLogger();
let trRunId: number;

function fetchCases() {
  // retrieves and returns TestRail cases
  return axios({
    method: 'get',
    url: `${trOptions.host}${trOptions.apiPath}get_cases/${trOptions.projectId}&suite_id=${trOptions.suiteId}&section_id=${trOptions.groupId}`,
    headers: { 'Content-Type': 'application/json' },
    auth: {
      username: trOptions.username,
      password: trOptions.password,
    },
  });
}

function createRun(caseIds: number[]) {
  // adds TestRail test run and returns TestRail run ID.
  return axios({
    method: 'post',
    url: `${trOptions.host}${trOptions.apiPath}add_run/${trOptions.projectId}`,
    headers: { 'Content-Type': 'application/json' },
    auth: {
      username: trOptions.username,
      password: trOptions.password,
    },
    data: JSON.stringify({
      suite_id: trOptions.suiteId,
      name: `${trOptions.runName} ${getDateTimeString()}`,
      description: 'Local Cypress E2E spec run.',
      include_all: trOptions.includeAllInTestRun,
      case_ids: caseIds,
    }),
  });
}

function postResults(runId: number) {
  // adds TestRail results and returns TestRail results data.
  return axios({
    method: 'post',
    url: `${trOptions.host}${trOptions.apiPath}add_results_for_cases/${runId}`,
    headers: { 'Content-Type': 'application/json' },
    auth: {
      username: trOptions.username,
      password: trOptions.password,
    },
    data: JSON.stringify({ results: cyResults }),
  });
}

function closeRun(runId: number) {
  // closes run.
  return axios({
    method: 'post',
    url: `${trOptions.host}${trOptions.apiPath}close_run/${runId}`,
    headers: { 'Content-Type': 'application/json' },
    auth: {
      username: trOptions.username,
      password: trOptions.password,
    },
  });
}

// Get cases, add run, add results, then close run.
fetchCases()
  .then((response: any) => {
    const caseIds = response.data.cases.map((item: any) => item.id);

    trLogger.log('Case IDs fetched from TestRail:');
    console.log(caseIds.join(', '));
    if (caseIds.length !== cyCaseIds.length) {
      trLogger.warn(
        'Cypress Case-IDs count does NOT match TestRail Case-IDs count.',
      );
    } else {
      trLogger.log('Cypress Case-IDs count matches TestRail Case-IDs count.');
    }

    createRun(caseIds)
      .then((response: any) => {
        const runId = response.data.id;

        trRunId = runId;
        trLogger.success('TEST RUN ADDED to TestRail.  Run ID returned:');
        console.log(trRunId);

        postResults(runId)
          .then((response: any) => {
            const resultsData = response.data;

            trLogger.success(
              'TESTRAIL RESULTS POSTED to TestRail.  Results data returned:',
            );
            console.log(resultsData);

            closeRun(trRunId)
              .then((response: any) => {
                const runName = response.data.name;

                trLogger.success('TESTRAIL RUN CLOSED.  Run name returned:');
                console.log(runName);
                trLogger.success(
                  `Run should be viewable at:\n${trOptions.host}index.php?/runs/view/${trRunId}`,
                );
              })
              .catch((err: any) => {
                trLogger.errorObj('closeRun method FAILED! ', err);
                trLogger.log(
                  "If output is missing when you scroll back to top of shell window, increase your shell's screen-buffer size.",
                );
                process.exit(1);
              });
          })
          .catch((err: any) => {
            trLogger.errorObj('postResults method FAILED! ', err);
            trLogger.log(
              "If output is missing when you scroll back to top of shell window, increase your shell's screen-buffer size.",
            );
            process.exit(1);
          });
      })
      .catch((err: any) => {
        trLogger.errorObj('createRun method FAILED! ', err);
        trLogger.log(
          "If output is missing when you scroll back to top of shell window, increase your shell's screen-buffer size.",
        );
        process.exit(1);
      });
  })
  .catch((err: any) => {
    trLogger.errorObj('fetchCases method FAILED! ', err);
    trLogger.log(
      "If output is missing when you scroll back to top of shell window, increase your shell's screen-buffer size.",
    );
    process.exit(1);
  });
/* eslint-enable @typescript-eslint/no-explicit-any */
