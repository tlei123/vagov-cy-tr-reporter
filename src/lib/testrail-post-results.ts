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
  })
    .then((response) => {
      return response.data.cases.map((item: any) => item.id);
    })
    .catch((error) => {
      throw new Error(`get_cases API-call FAILED: ${error.message}`);
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
  })
    .then((response) => {
      return response.data.id;
    })
    .catch((error) => {
      throw new Error(`add_run API-call FAILED: ${error.message}`);
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
  })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      throw new Error(
        `add_results_for_cases API-call FAILED: ${error.message}`,
      );
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
  })
    .then((response) => {
      return response.data.name;
    })
    .catch((error) => {
      throw new Error(`close_run API-call FAILED: ${error.message}`);
    });
}

// Get cases, add run, add results, then close run.
fetchCases().then((caseIds: number[]) => {
  trLogger.log('Case IDs fetched from TestRail:');
  console.log(caseIds.join(', '));
  if (caseIds.length !== cyCaseIds.length) {
    trLogger.warn(
      'Cypress Case-IDs count does NOT match TestRail Case-IDs count.',
    );
  } else {
    trLogger.log('Cypress Case-IDs count matches TestRail Case-IDs count.');
  }

  createRun(caseIds).then((runId: number) => {
    trRunId = runId;
    trLogger.success('TEST RUN ADDED to TestRail.  Run ID returned:');
    console.log(trRunId);

    postResults(runId).then((resultsData: any) => {
      trLogger.success(
        'TESTRAIL RESULTS POSTED to TestRail.  Results data returned:',
      );
      console.log(resultsData);

      closeRun(trRunId).then((runName: string) => {
        trLogger.success('TESTRAIL RUN CLOSED.  Run name returned:');
        console.log(runName);
        trLogger.success(
          `Run should be viewable at:\n${trOptions.host}index.php?/runs/view/${trRunId}`,
        );
      });
    });
  });
});
