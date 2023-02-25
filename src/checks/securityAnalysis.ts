import { getRepoUrl, octokit } from '../utils/init';
import { processRequestError } from '../utils/processRequestError';
import { RepoDetails } from '../types';

export async function checkSecurityAnalysis(repoDetails: RepoDetails) {
  const securityUrl = `${getRepoUrl(repoDetails)}/settings/security_analysis`;

  // TODO: secret scanning on push (beta enterprise feature, can't find API)
  // and any others?

  try {
    await octokit.rest.repos.checkVulnerabilityAlerts(repoDetails);
    console.log('✅ Vulnerability alerts are enabled');
  } catch (err) {
    const errInfo = processRequestError(err);
    if (errInfo?.status === 404) {
      console.error('❌ Vulnerability alerts are disabled. Enable at', securityUrl);
    } else {
      throw err;
    }
  }
  console.log();
}
