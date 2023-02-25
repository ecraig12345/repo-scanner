import dotenv from 'dotenv';
import { Octokit } from 'octokit';
import { RepoDetails } from '../types';

const repoInfos = process.argv.slice(2);

if (!repoInfos.length || repoInfos.some((r) => !/^[\w-]+\/[\w-]+$/.test(r))) {
  // TODO command name
  console.error('Usage: node lib/index.js <owner/repo>');
  process.exit(1);
}

dotenv.config();
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('GITHUB_TOKEN must be provided via an environment variable or .env file');
}

export const octokit = new Octokit({ auth: token });

export const githubUrl = 'https://github.com';

export const repos = repoInfos.map((r) => {
  const [owner, repo] = r.split('/');
  return { owner, repo };
});

export const getRepoUrl = (repoDetails: RepoDetails) =>
  `${githubUrl}/${repoDetails.owner}/${repoDetails.repo}`;
export const getActionsUrl = (repoDetails: RepoDetails) =>
  `${getRepoUrl(repoDetails)}/settings/actions`;
