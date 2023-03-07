import { getActionsUrl, octokit } from '../init';
import { CheckParams } from './types';

/**
 * Settings - Actions - General - Workflow permissions
 */
export async function checkWorkflowPerms(params: CheckParams) {
  const { logger, repoDetails } = params;

  const actionsUrl = getActionsUrl(repoDetails);

  const workflowPerms = (
    await octokit.rest.actions.getGithubActionsDefaultWorkflowPermissionsRepository(repoDetails)
  ).data;
  if (workflowPerms.default_workflow_permissions === 'write') {
    logger.danger('"Workflow permissions" is set to allow write access from workflows', {
      details:
        'This should be changed to read-only, with specific perms granted to individual ' +
        'workflows as needed using a "permissions" block. (Fork PR workflows run via the ' +
        "pull_request trigger will always get a read-only token, but it's still good practice " +
        'to minimize possible access from main branch workflows or in-repo PR workflows.)',
      resolveUrl: actionsUrl,
      docsUrl: 'https://docs.github.com/en/actions/security-guides/automatic-token-authentication',
    });
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
