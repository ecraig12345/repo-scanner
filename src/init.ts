import { program, InvalidArgumentError } from 'commander';
import dotenv from 'dotenv';
import { Octokit } from 'octokit';
import { Options, RepoDetails } from './types';

export const name = 'secure-repo';

dotenv.config();
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('GITHUB_TOKEN must be provided via an environment variable or .env file');
  process.exit(1);
}

program
  .name(name)
  .description("Check a GitHub repo's configuration for security concerns")
  .version(require('../package.json').version)
  .option('--no-browser', 'Skip browser-based checks')
  .argument('<repos...>', 'GitHub repos to check, in "owner/repo" format', (value) => {
    if (!/^[\w-]+\/[\w-]+$/.test(value)) {
      throw new InvalidArgumentError('Must be in "owner/repo" format.');
    }
    return value;
  })
  .parse();

export const options = { ...program.opts<Options>() };

export const repos = program.args.map((r) => {
  const [owner, repo] = r.split('/');
  return { owner, repo };
});

export const octokit = new Octokit({ auth: token });

export const githubUrl = 'https://github.com';

export const getRepoUrl = (repoDetails: RepoDetails) =>
  `${githubUrl}/${repoDetails.owner}/${repoDetails.repo}`;

export const getActionsUrl = (repoDetails: RepoDetails) =>
  `${getRepoUrl(repoDetails)}/settings/actions`;
