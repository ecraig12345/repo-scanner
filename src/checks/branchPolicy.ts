import { getRepoUrl, octokit } from '../init';
import { processRequestError } from '../utils/processRequestError';
import { RepoDetails } from '../types';

type Policy = Awaited<ReturnType<typeof octokit.rest.repos.getBranchProtection>>['data'];
type Identities = Required<
  Required<Policy>['required_pull_request_reviews']
>['bypass_pull_request_allowances'];

function printIdentities(identities: Identities, indent: string) {
  const apps = identities.apps?.map((app) => app.name);
  const teams = identities.teams?.map((team) => team.name);
  const users = identities.users?.map((user) => user.login);
  apps?.length && console.log(indent, '  • Apps:', apps.join(', '));
  teams?.length && console.log(indent, '  • Teams:', teams.join(', '));
  users?.length && console.log(indent, '  • Users:', users.join(', '));
}

function checkPrPolicy(policy: Policy) {
  const prPolicy = policy.required_pull_request_reviews;
  if (prPolicy) {
    console.log('  ✅ Pull requests are required');
    const indent = '    ';

    const approvalCount = prPolicy.required_approving_review_count || 0;
    if (approvalCount > 0) {
      console.log(indent, `✅ ${approvalCount} approval(s) required`);
    } else {
      console.log(indent, '❌ At least 1 approval should be required');
    }

    if (prPolicy.dismiss_stale_reviews) {
      console.log(indent, '✅ Stale reviews are dismissed');
    }
    if (prPolicy.require_last_push_approval) {
      console.log(indent, '✅ Approval of last push is required');
    }
    if (!prPolicy.dismiss_stale_reviews && !prPolicy.require_last_push_approval) {
      console.log(
        indent,
        '🔸 Consider requiring last push approval or dismissing stale reviews on push',
      );
    }

    if (prPolicy.require_code_owner_reviews) {
      console.log(indent, '✅ Code owners must approve');
    } else {
      console.log(indent, '🔸 Consider requiring code owners to approve');
    }

    if (prPolicy.dismissal_restrictions) {
      console.log(indent, '✅ Review dismissal is restricted');
    } else {
      console.log(indent, '🔸 Consider restricting review dismissal');
    }

    if (prPolicy.bypass_pull_request_allowances) {
      console.log(indent, '🔸 Bypassing pull requests is allowed for:');
      printIdentities(prPolicy.bypass_pull_request_allowances, indent + '   ');
    } else {
      console.log(
        indent,
        '✅ Bypassing pull requests is not allowed',
        policy.enforce_admins ? '' : '(except for admins)',
      );
    }
  } else {
    console.log('  ❌ Pull requests should be required');
  }
}

/**
 * Settings - Branches - Branch protection rules - (default branch)
 */
export async function checkBranchPolicy(repoDetails: RepoDetails, defaultBranch: string) {
  const branchSettingsUrl = `${getRepoUrl(repoDetails)}/settings/branches`;

  let policy: Policy;
  try {
    policy = (
      await octokit.rest.repos.getBranchProtection({ ...repoDetails, branch: defaultBranch })
    ).data;
  } catch (err) {
    const errInfo = processRequestError(err);
    // 404 means either the branch isn't protected, or the user doesn't have admin perms.
    // Earlier code should have done the admin check, so we can assume not protected here.
    if (errInfo?.status === 404) {
      console.log(
        `❌ Default branch "${defaultBranch}" is not protected. Add a policy at`,
        `${branchSettingsUrl}.\n`,
      );
      return;
    }
    throw err;
  }

  console.log(`Default branch protection (see ${branchSettingsUrl}):`);

  checkPrPolicy(policy);

  if (policy.required_status_checks?.contexts.length) {
    console.log('  ✅ Status checks are required');
    policy.required_status_checks.contexts.forEach((c) => console.log(`     • ${c}`));
  } else {
    // Having the checkbox checked but no specific checks listed has no effect
    // (it's the same as having the checkbox unchecked)
    console.log('  ❌ Specific status checks should be required to pass');
  }

  if (policy.allow_force_pushes?.enabled) {
    console.log('  ❌ Force pushes are allowed');
  } else {
    console.log('  ✅ Force pushes are not allowed');
  }

  if (policy.allow_deletions?.enabled) {
    console.log('  ❌ Deleting the branch is allowed');
  } else {
    console.log('  ✅ Deleting the branch is not allowed');
  }

  if (policy.enforce_admins?.enabled) {
    console.log('  ✅ Admins may not bypass policies');
  } else {
    console.log('  🔸 Admins may bypass policies');
  }

  // TODO not sure if there's anything else that's worth checking

  // policy.restrictions: "Restrict who can push to matching branches"
  // (same format as bypass_pull_request_allowances)

  console.log();
}
