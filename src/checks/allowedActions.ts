import { getActionsUrl, octokit } from '../init';
import { CheckParams } from './types';

/**
 * Settings - Actions - General - Actions permissions
 */
export async function checkAllowedActions(params: CheckParams) {
  const { logger, repoDetails } = params;

  const actionsUrl = getActionsUrl(repoDetails);

  // TODO does this work for settings inherited from org?
  const actionsPerms = (
    await octokit.rest.actions.getGithubActionsPermissionsRepository(repoDetails)
  ).data;
  if (!actionsPerms.enabled) {
    logger.good('Actions are disabled\n');
    return;
  }

  if (actionsPerms.allowed_actions === 'all') {
    logger.warning('All actions are allowed', {
      details: 'Consider restricting to certain actions.',
      resolveUrl: actionsUrl,
    });
  } else if (actionsPerms.allowed_actions === 'selected') {
    logger.good('Only selected actions are allowed');
    // To get details:
    // const allowedActions = await octokit.rest.actions.getAllowedActionsRepository(repoDetails);
  } else if (actionsPerms.allowed_actions === 'local_only') {
    logger.good('Only local actions are allowed');
  } else {
    logger.warning(`Unknown allowed_actions value: "${actionsPerms.allowed_actions}"`, {
      details: `Please verify this setting at ${actionsUrl}.`,
    });
  }
}
