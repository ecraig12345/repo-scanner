import { octokit } from '../init';
import { processRequestError } from '../utils/processRequestError';
import { RepoDetails } from '../types';

export async function checkEnvironmentsSecrets(repoDetails: RepoDetails, repoId: number) {
  type Environment = Awaited<ReturnType<typeof octokit.rest.repos.getEnvironment>>['data'];
  let envs: Environment[] | undefined;
  try {
    envs = (await octokit.rest.repos.getAllEnvironments(repoDetails)).data.environments;
  } catch (err) {
    const errInfo = processRequestError(err);
    // This threw with 404 for a private repo without environments
    if (errInfo?.status !== 404) throw err;
  }
  if (!envs?.length) {
    console.log('✅ No environments found\n');
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
    console.log('✅ No environments contain secrets with inadequate protection');
  } else {
    console.log('❗️ Environments containing secrets with inadequate protection:');
    for (const env of dangerEnvs) {
      console.log(`  ${env.name} (${env.secrets.join(', ')})`);
    }
    console.log(
      'These secrets might be accessible to PRs. Verify whether this is okay,',
      'and if not, add branch restrictions or or protection rules to the environment.',
    );
  }
  console.log();
}
