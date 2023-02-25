import { Browser } from 'puppeteer';
import { getActionsUrl } from '../init';
import { RepoDetails, RepoVisbility } from '../types';

export async function checkForkWorkflowApproval(
  browser: Browser,
  repoDetails: RepoDetails,
  visibility: RepoVisbility,
) {
  if (visibility === 'private' || visibility === 'internal') {
    // There are some settings for this under form[action$="/settings/actions/fork_pr_workflows_policy"]
    // but this is less of an immediate security concern, due to limited ability for outside forks.
    console.log(`Skipping fork PR approvals setting check for ${visibility} repo\n`);
    return;
  }

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
    console.log('❗️ Could not find fork PR workflow approval setting on page');
  } else if (checkedSetting === 'ALL_OUTSIDE_COLLABORATORS') {
    console.log('✅ Fork PR workflow approval required for all outside collaborators');
  } else {
    console.log(
      '❌ Fork PR workflow approval is only required for first-time contributors. This is risky',
      'because if a malicious contributor makes one good PR, they could then make a malicious PR',
      'which would run workflows and potentially access secrets without maintainer knowledge.',
      'Consider changing this setting to "Require approval for all outside collaborators at',
      actionsUrl + '.',
    );
  }
  console.log();
}
