import { getActionsUrl, octokit } from '../init';
import { RepoDetails } from '../types';

/**
 * Settings - Actions - General - Workflow permissions
 */
export async function checkWorkflowPerms(repoDetails: RepoDetails) {
  const actionsUrl = getActionsUrl(repoDetails);

  const workflowPerms = (
    await octokit.rest.actions.getGithubActionsDefaultWorkflowPermissionsRepository(repoDetails)
  ).data;
  if (workflowPerms.default_workflow_permissions === 'write') {
    console.log(
      '❌ "Workflow permissions" is set to allow write access from workflows, including PRs.',
      'This is NOT SAFE and should immediately be changed to read-only, with specific',
      'perms granted to individual workflows as needed using a "permissions" block.',
      `(see ${actionsUrl})`,
    );
  } else {
    console.log('✅ "Workflow permissions" setting is read-only');
  }
  console.log();

  if (workflowPerms.can_approve_pull_request_reviews) {
    console.log(
      "❗️ GitHub Actions are allowed to create and approve pull requests. Disable this if it's",
      "not needed. If it's currently used, you may want to consider another approach.",
      `(see ${actionsUrl})`,
    );
  } else {
    console.log('✅ GitHub Actions are not allowed to create or approve pull requests');
  }
  console.log();
}
