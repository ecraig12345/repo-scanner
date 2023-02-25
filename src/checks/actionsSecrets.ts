import { octokit } from '../init';
import { ResultLogger } from '../logger';
import { RepoDetails } from '../types';

// An incomplete regex of common names/substrings for secrets containing sensitive credentials
// (the groups at the beginning and end are meant to approximate \b but with underscores)
const dangerPattern = /(^|_)token|pat|auth[^_]*|cred[^_]*|password|secret|key|pass|pwd|pw(_|$)/i;

/**
 * Settings - Secrets and variables - Actions
 */
export async function checkActionsSecrets(logger: ResultLogger, repoDetails: RepoDetails) {
  const secrets = (await octokit.rest.actions.listRepoSecrets(repoDetails)).data.secrets.map(
    (s) => s.name,
  );
  if (secrets.length === 0) {
    logger.good('No actions secrets found');
    return;
  }

  const dangerSecrets = secrets.filter((secret) => dangerPattern.test(secret));
  if (dangerSecrets.length) {
    logger.danger('Found actions secrets which may be credentials', {
      details:
        'Secrets marked with ❌ appear to be sensitive credentials (based on names). ' +
        'STRONGLY RECONSIDER whether these should be available to PRs! If not, rotate the secrets ' +
        'and move them to an environment. If GitHub access is needed for a PR workflow, use the ' +
        'built-in GITHUB_TOKEN with minimal specific permissions if possible.',
      subLogs: dangerSecrets.map((secret) => ({
        message: secret,
        type: dangerSecrets.includes(secret) ? 'danger' : 'warning',
      })),
    });
  } else {
    logger.warning('Found actions secrets', {
      details:
        "Verify whether it's safe for any PR build to access these secrets. " +
        'If not, rotate the secrets and move them to an environment. ' +
        '(Non-sensitive secrets can also be stored in plain text as actions variables.)',
      subLogs: secrets.map((secret) => ({ message: secret, type: 'info' })),
    });
  }
}
