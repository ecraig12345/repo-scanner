import { Browser } from 'puppeteer';
import { getActionsUrl } from '../init';
import { ResultLogger } from '../logger';
import { RepoDetails, GHRepoVisibility } from '../types';

/**
 * Settings - Actions - General - Fork pull request workflows from outside collaborators
 *
 * This check uses puppeteer due to a missing API.
 */
export async function checkForkWorkflowApproval(
  logger: ResultLogger,
  browser: Browser,
  repoDetails: RepoDetails,
  visibility: GHRepoVisibility,
) {
  if (visibility === 'private' || visibility === 'internal') {
    // There are some settings for this under form[action$="/settings/actions/fork_pr_workflows_policy"]
    // but this is less of an immediate security concern, due to limited ability for outside forks.
    logger.info(`Skipping fork PR approvals setting check for ${visibility} repo\n`);
    return;
  }

  try {
    // Navigate to actions settings
    const actionsUrl = getActionsUrl(repoDetails);
    const page = (await browser.pages())[0];
    await page.goto(actionsUrl);
    // This may initially load an SSO dialog at the same URL, so wait for an element from the
    // real form to load (with no time limit for the SSO process)
    await page.waitForSelector('actions-policy-form', { timeout: 0 });

    const formSelector = `form[action$="/settings/actions/fork_pr_approvals_policy"]`;
    const inputSelector = `${formSelector} input[name="actions_fork_pr_approvals"]`;
    await page.waitForSelector(formSelector);

    // get all the settings
    // const settings = await page.evaluate((inputSelector) => {
    //   const settings = document.querySelectorAll(inputSelector);
    //   return (Array.from(settings) as HTMLInputElement[]).map((el) => [el.value, el.checked]);
    // }, inputSelector);
    // console.dir(settings);

    const checkedSetting = await page.evaluate((inputSelector) => {
      return (document.querySelector(inputSelector + ':checked') as HTMLInputElement | null)?.value;
    }, inputSelector);

    if (!checkedSetting) {
      logger.unknown('Could not find fork PR workflow approval setting on page');
    } else if (checkedSetting === 'ALL_OUTSIDE_COLLABORATORS') {
      logger.good('Fork PR workflow approval required for all outside collaborators');
    } else {
      // TODO: the level of this should actually depend on:
      // - whether there are actions secrets (and guess of their risk level)
      // - whether there are unprotected environments
      // - the GITHUB_TOKEN permissions (default and effective)
      logger.warning('Fork PR workflow approval is only required for first-time contributors', {
        resolveUrl: actionsUrl,
        details:
          'This is potentially risky because if a malicious contributor makes one good PR, they ' +
          'could then make a malicious PR which would run workflows and potentially access ' +
          'secrets without maintainer knowledge. If you have any secrets accessible to PRs ' +
          '(or have any workflows where GITHUB_TOKEN has write permissions), consider changing ' +
          'this setting to "Require approval for all outside collaborators".',
      });
    }
  } catch (err) {
    logger.unknown('Error checking fork PR workflow approval setting', { details: String(err) });
  }
}
