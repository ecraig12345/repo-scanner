import { getRepoUrl, octokit } from '../init';
import { processRequestError } from '../utils/processRequestError';
import { GHData, RepoDetails } from '../types';
import { ResultLogEntry, ResultLogger } from '../logger';

type Policy = GHData<typeof octokit.rest.repos.getBranchProtection>;
type Identities = Required<
  Required<Policy>['required_pull_request_reviews']
>['bypass_pull_request_allowances'];

function getIdentityLogs(identities: Identities): ResultLogEntry[] {
  const { apps, teams, users } = identities;
  const type = 'info' as const;
  return [
    ...(apps?.length ? [{ type, message: `Apps: ${apps.map((a) => a.name).join(', ')}` }] : []),
    ...(teams?.length ? [{ type, message: `Teams: ${teams.map((t) => t.name).join(', ')}` }] : []),
    ...(users?.length ? [{ type, message: `Users: ${users.map((u) => u.login).join(', ')}` }] : []),
  ];
}

function checkPrPolicy(
  logger: ResultLogger,
  policy: Policy,
  defaultBranch: string,
  branchSettingsUrl: string,
) {
  const prPolicy = policy.required_pull_request_reviews;
  if (!prPolicy) {
    logger.danger(`Pull requests should be required for default branch "${defaultBranch}"`);
    return;
  }

  logger.startSection(`Pull requests are required for default branch "${defaultBranch}"`, {
    resolveUrl: branchSettingsUrl,
  });

  const approvalCount = prPolicy.required_approving_review_count || 0;
  if (approvalCount > 0) {
    logger.good(`${approvalCount} approval(s) required`);
  } else {
    logger.danger('At least 1 approval should be required');
  }

  if (prPolicy.dismiss_stale_reviews) {
    logger.good('Stale reviews are dismissed');
  }
  if (prPolicy.require_last_push_approval) {
    logger.good('Approval of last push is required');
  }
  if (!prPolicy.dismiss_stale_reviews && !prPolicy.require_last_push_approval) {
    logger.caution('Consider requiring last push approval or dismissing stale reviews on push');
  }

  if (prPolicy.require_code_owner_reviews) {
    logger.good('Code owners must approve');
  } else {
    logger.caution('Consider requiring code owners to approve');
  }

  if (prPolicy.dismissal_restrictions) {
    logger.good('Review dismissal is restricted');
  } else {
    logger.caution('Consider restricting review dismissal');
  }

  if (prPolicy.bypass_pull_request_allowances) {
    logger.caution('Bypassing pull requests is allowed for:', {
      subLogs: getIdentityLogs(prPolicy.bypass_pull_request_allowances),
    });
  } else {
    logger.good(
      'Bypassing pull requests is not allowed' +
        (policy.enforce_admins ? '' : ' (except for admins)'),
    );
  }

  logger.writeSection();
}

/**
 * Settings - Branches - Branch protection rules - (default branch)
 */
export async function checkBranchPolicy(
  logger: ResultLogger,
  repoDetails: RepoDetails,
  defaultBranch: string,
) {
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
    if (errInfo.status === 404) {
      logger.danger(`Default branch "${defaultBranch}" should be protected`, {
        resolveUrl: branchSettingsUrl,
      });
    } else {
      logger.unknown('Error checking branch policy', { details: errInfo.message });
    }
    return;
  }

  // TODO add proper subhead/section support (the PR policy should really be under the same section
  // but ended up separate due to number of sub-checks of its own)
  checkPrPolicy(logger, policy, defaultBranch, branchSettingsUrl);

  logger.startSection(`Default branch "${defaultBranch}" is protected`);

  if (policy.required_status_checks?.contexts.length) {
    logger.good('Status checks are required', {
      subLogs: policy.required_status_checks.contexts.map((c) => ({
        type: 'info' as const,
        message: c,
      })),
    });
  } else {
    // Having the checkbox checked but no specific checks listed has no effect
    // (it's the same as having the checkbox unchecked)
    logger.danger('Specific status checks should be required to pass');
  }

  if (policy.allow_force_pushes?.enabled) {
    logger.danger('Force pushes should not be allowed');
  } else {
    logger.good('Force pushes are not allowed');
  }

  if (policy.allow_deletions?.enabled) {
    logger.danger('Deleting the branch should not be allowed');
  } else {
    logger.good('Deleting the branch is not allowed');
  }

  if (policy.enforce_admins?.enabled) {
    logger.good('Admins may not bypass policies');
  } else {
    logger.caution('Admins may bypass policies');
  }

  // TODO not sure if there's anything else that's worth checking

  // policy.restrictions: "Restrict who can push to matching branches"
  // (same format as bypass_pull_request_allowances)

  logger.writeSection();
}
