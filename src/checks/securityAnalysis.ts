import { getRepoUrl, octokit } from '../init';
import { processRequestError } from '../utils/processRequestError';
import { RepoDetails } from '../types';

/**
 * Settings - Code security and analysis - Dependabot alerts
 */
export async function checkSecurityAnalysis(repoDetails: RepoDetails) {
  const securityUrl = `${getRepoUrl(repoDetails)}/settings/security_analysis`;

  // TODO: secret scanning on push (beta enterprise feature, can't find API)
  // and any others?

  try {
    await octokit.rest.repos.checkVulnerabilityAlerts(repoDetails);
    console.log('✅ Vulnerability alerts are enabled');
  } catch (err) {
    const errInfo = processRequestError(err);
    // 404 means either alerts are disabled, or the user doesn't have admin perms.
    // Earlier code should have done the admin check, so we can assume disabled.
    if (errInfo?.status === 404) {
      console.error('❌ Vulnerability alerts are disabled. Enable at', securityUrl);
    } else {
      throw err;
    }
  }
  console.log();
}
