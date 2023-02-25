import { Browser } from 'puppeteer';
import { checkActionsSecrets } from './checks/actionsSecrets';
import { checkAllowedActions } from './checks/allowedActions';
import { checkBranchPolicy } from './checks/branchPolicy';
import { checkEnvironmentsSecrets } from './checks/environmentSecrets';
import { checkForkWorkflowApproval } from './checks/forkWorkflowApproval';
import { checkSecurityAnalysis } from './checks/securityAnalysis';
import { checkWorkflowPerms } from './checks/workflowPerms';
import { RepoDetails, GHData, GHRepoVisibility } from './types';
import { octokit, options, repos } from './init';
import { startPuppeteer } from './utils/startPuppeteer';
import { ResultLogger } from './logger';
import { processRequestError } from './utils/processRequestError';

async function checkRepo(params: {
  logger: ResultLogger;
  username: string;
  browser: Browser | undefined;
  repoDetails: RepoDetails;
}) {
  const { logger, username, browser, repoDetails } = params;

  logger.setRepo(repoDetails);

  logger.repoHeader();

  // Verify adequate perms
  let perms: GHData<typeof octokit.rest.repos.getCollaboratorPermissionLevel>;
  try {
    perms = (await octokit.rest.repos.getCollaboratorPermissionLevel({ ...repoDetails, username }))
      .data;
    // Repo exists and user has at least read perms, but not admin
    if (!perms.user?.permissions?.admin) {
      logger.unknown('You must be a repo admin to run this script');
      return;
    }
  } catch (err) {
    // Repo doesn't exist, is private, token isn't authorized for org acces, ...?
    const errInfo = processRequestError(err);
    logger.unknown('Error checking repo permissions', { details: errInfo.message });
    return;
  }

  // Get repo info which is needed later
  const repo = (await octokit.rest.repos.get(repoDetails)).data;

  await checkActionsSecrets(logger, repoDetails);
  await checkEnvironmentsSecrets(logger, repoDetails, repo.id);
  await checkBranchPolicy(logger, repoDetails, repo.default_branch);
  await checkAllowedActions(logger, repoDetails);
  await checkWorkflowPerms(logger, repoDetails);
  await checkSecurityAnalysis(logger, repoDetails);
  browser &&
    (await checkForkWorkflowApproval(
      logger,
      browser,
      repoDetails,
      repo.visibility as GHRepoVisibility,
    ));
  console.log('\n');

  // Other possible APIs:
  // - octokit.rest.actions.getWorkflowAccessToRepository: for the private/internal
  //   "Access" setting, which isn't really a security concern
}

(async () => {
  const logger = new ResultLogger();

  const username = (await octokit.rest.users.getAuthenticated()).data.login;

  // TODO wait to launch until needed? or do all browser checks at end? (harder to read output)
  const browser = options.browser ? await startPuppeteer() : undefined;

  console.log();
  for (const repoDetails of repos) {
    await checkRepo({ logger, username, browser, repoDetails });
  }

  await browser?.close();
})().catch((err) => {
  console.error(err?.stack || err?.message || err);
  process.exit(1);
});
