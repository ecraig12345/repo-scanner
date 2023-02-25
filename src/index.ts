import { Browser } from 'puppeteer';
import { checkActionsSecrets } from './checks/actionsSecrets';
import { checkAllowedActions } from './checks/allowedActions';
import { checkBranchPolicy } from './checks/branchPolicy';
import { checkEnvironmentsSecrets } from './checks/environmentSecrets';
import { checkForkWorkflowApproval } from './checks/forkWorkflowApproval';
import { checkSecurityAnalysis } from './checks/securityAnalysis';
import { checkWorkflowPerms } from './checks/workflowPerms';
import { RepoDetails, RepoVisbility } from './types';
import { octokit, options, repos } from './init';
import { startPuppeteer } from './utils/startPuppeteer';

async function checkRepo(username: string, browser: Browser | undefined, repoDetails: RepoDetails) {
  console.log(`======== ${repoDetails.owner}/${repoDetails.repo} ========\n`);

  // Verify adequate perms
  const perms = (
    await octokit.rest.repos.getCollaboratorPermissionLevel({ ...repoDetails, username })
  ).data;
  if (!perms.user?.permissions?.admin) {
    console.log('❓ You must be a repo admin to run this script\n');
    return;
  }

  // Get repo info which is needed later (also verify the token has access)
  const repo = (await octokit.rest.repos.get(repoDetails)).data;

  await checkActionsSecrets(repoDetails);
  await checkEnvironmentsSecrets(repoDetails, repo.id);
  await checkBranchPolicy(repoDetails, repo.default_branch);
  await checkAllowedActions(repoDetails);
  await checkWorkflowPerms(repoDetails);
  await checkSecurityAnalysis(repoDetails);
  browser &&
    (await checkForkWorkflowApproval(browser, repoDetails, repo.visibility as RepoVisbility));
  console.log('\n');

  // Other possible APIs:
  // - octokit.rest.actions.getWorkflowAccessToRepository: for the private/internal
  //   "Access" setting, which isn't really a security concern
}

(async () => {
  const username = (await octokit.rest.users.getAuthenticated()).data.login;

  const browser = options.browser ? await startPuppeteer() : undefined;

  console.log();
  for (const repo of repos) {
    await checkRepo(username, browser, repo);
  }

  await browser?.close();
})().catch((err) => {
  console.error(err?.stack || err?.message || err);
  process.exit(1);
});
