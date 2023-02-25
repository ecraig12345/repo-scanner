import { getRepoUrl, octokit } from '../init';
import { processRequestError } from '../utils/processRequestError';
import { GHData } from '../types';
import { CheckParams } from './types';

type Environment = GHData<typeof octokit.rest.repos.getEnvironment>;

/**
 * Settings - Environments - (name)
 */
export async function checkEnvironmentsSecrets(params: CheckParams & { repoId: number }) {
  const { logger, repoDetails, repoId } = params;

  let envs: Environment[] | undefined;
  try {
    envs = (await octokit.rest.repos.getAllEnvironments(repoDetails)).data.environments;
  } catch (err) {
    const errInfo = processRequestError(err);
    // 404 means either there are no environments, or the user doesn't have admin perms.
    // Earlier code should have done the admin check, so we can assume no environments.
    if (errInfo.status !== 404) {
      logger.unknown('Error getting environments', { details: errInfo.message });
      return;
    }
  }
  if (!envs?.length) {
    logger.good('No environments found');
    return;
  }

  const dangerEnvs: Array<{ name: string; secrets: string[] }> = [];
  for (const env of envs) {
    const envSecrets = (
      await octokit.rest.actions.listEnvironmentSecrets({
        ...repoDetails,
        repository_id: repoId,
        environment_name: env.name,
      })
    ).data.secrets;

    // Environment access can be restricted to specific branches or any protected branch
    const hasBranchPolicy =
      env.deployment_branch_policy?.custom_branch_policies ||
      env.deployment_branch_policy?.protected_branches;
    // It can also be restricted by requiring approval or a wait timer, but a wait timer alone
    // is probably not good enough protection
    const hasOkProtectionRule = env.protection_rules?.some((r) => r.type !== 'wait_timer');

    if (envSecrets.length > 0 && !hasBranchPolicy && !hasOkProtectionRule) {
      const secrets = envSecrets.map((s) => s.name);
      dangerEnvs.push({ name: env.name, secrets });
    }
  }

  if (dangerEnvs.length === 0) {
    logger.good('No environments contain secrets with inadequate protection');
  } else {
    // TODO: possibly consider risk level of secrets
    logger.warning('Some environments contain secrets with inadequate protection', {
      details:
        'These secrets might be accessible to PRs. Verify whether this is okay, ' +
        'and if not, add branch restrictions or or protection rules to the environment.',
      resolveUrl: `${getRepoUrl(repoDetails)}/settings/environments`,
      subLogs: dangerEnvs.map((env) => ({
        type: 'info' as const,
        message: `${env.name} (${env.secrets.join(', ')})`,
      })),
    });
  }
}
