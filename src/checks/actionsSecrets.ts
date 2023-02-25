import { octokit } from '../utils/init';
import { RepoDetails } from '../types';

// An incomplete list of common names/substrings for secrets containing sensitive credentials
const dangerPatterns = ['npm', 'repo_pat', 'gh_token', 'github_pat', 'gh_pat'].map(
  (str) => new RegExp(`(^|_)${str}(_|$)`, 'i'),
);

export async function checkActionsSecrets(repoDetails: RepoDetails) {
  const secrets = (await octokit.rest.actions.listRepoSecrets(repoDetails)).data.secrets;
  if (secrets.length === 0) {
    console.log('✅ No actions secrets found\n');
    return;
  }

  const dangerSecrets = secrets.filter((secret) => dangerPatterns.some((p) => p.test(secret.name)));
  console.log(`${dangerSecrets.length ? '❌' : '❗️'} Actions secrets:`);
  for (const secret of secrets) {
    console.log(`  ${dangerSecrets.includes(secret) ? '❌' : '• '} ${secret.name}`);
  }
  if (dangerSecrets.length) {
    console.log(
      'Secrets marked with ❌ appear to be sensitive credentials (based on names).',
      'STRONGLY RECONSIDER whether these should be available to PRs! If not, rotate the secrets',
      'and move them to an environment. If GitHub access is needed for a PR workflow, use the',
      'built-in GITHUB_TOKEN with minimal specific permissions if possible.',
    );
  } else {
    console.log(
      "Verify whether it's safe for any PR build to access these secrets.",
      'If not, rotate the secrets and move them to an environment.',
    );
  }

  console.log();
}
