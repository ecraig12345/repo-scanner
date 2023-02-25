import { getActionsUrl, octokit } from '../init';
import { ResultLogger } from '../logger';
import { RepoDetails } from '../types';

/**
 * Settings - Actions - General - Workflow permissions
 */
export async function checkWorkflowPerms(logger: ResultLogger, repoDetails: RepoDetails) {
  const actionsUrl = getActionsUrl(repoDetails);

  const workflowPerms = (
    await octokit.rest.actions.getGithubActionsDefaultWorkflowPermissionsRepository(repoDetails)
  ).data;
  if (workflowPerms.default_workflow_permissions === 'write') {
    logger.danger(
      '"Workflow permissions" is set to allow write access from workflows, including PRs',
      {
        details:
          'This is NOT SAFE and should IMMEDIATELY be changed to read-only, with specific perms ' +
          'granted to individual workflows as needed using a "permissions" block. Otherwise, a ' +
          "malicious actor could steal the token from their PR's build and push code to " +
          'unprotected branches, create tags, possibly approve PRs, or other actions.',
        resolveUrl: actionsUrl,
        docsUrl:
          'https://docs.github.com/en/actions/security-guides/automatic-token-authentication',
      },
    );
  } else {
    logger.good('"Workflow permissions" setting is read-only');
  }

  if (workflowPerms.can_approve_pull_request_reviews) {
    logger.warning('GitHub Actions are allowed to create and approve pull requests', {
      details:
        "Disable this if it's not needed. If it's currently used, you may want to consider another approach.",
      resolveUrl: actionsUrl,
    });
  } else {
    logger.good('GitHub Actions are not allowed to create or approve pull requests');
  }
}
