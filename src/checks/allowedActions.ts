import { getActionsUrl, octokit } from '../init';
import { RepoDetails } from '../types';

export async function checkAllowedActions(repoDetails: RepoDetails) {
  const actionsUrl = getActionsUrl(repoDetails);

  // TODO does this work for settings inherited from org?
  const actionsPerms = (
    await octokit.rest.actions.getGithubActionsPermissionsRepository(repoDetails)
  ).data;
  if (!actionsPerms.enabled) {
    console.log('✅ Actions are disabled\n');
    return;
  }

  if (actionsPerms.allowed_actions === 'all') {
    console.log(
      '❗️ All actions are allowed. Consider restricting to certain actions.',
      `(see ${actionsUrl})`,
    );
  } else if (actionsPerms.allowed_actions === 'selected') {
    console.log('✅ Only selected actions are allowed');
    // To get details:
    // const allowedActions = await octokit.rest.actions.getAllowedActionsRepository(repoDetails);
  } else if (actionsPerms.allowed_actions === 'local_only') {
    console.log('✅ Only local actions are allowed');
  } else {
    console.log(
      `❗️ Unknown allowed_actions value: "${actionsPerms.allowed_actions}".`,
      `Please check this under "Actions permissions" at ${actionsUrl}.`,
    );
  }
  console.log();
}
