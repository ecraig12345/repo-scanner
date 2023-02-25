import { getRepoUrl, octokit } from '../init';
import { processRequestError } from '../utils/processRequestError';
import { RepoDetails } from '../types';
import { ResultLogger } from '../logger';

/**
 * Settings - Code security and analysis - Dependabot alerts
 */
export async function checkSecurityAnalysis(logger: ResultLogger, repoDetails: RepoDetails) {
  const securityUrl = `${getRepoUrl(repoDetails)}/settings/security_analysis`;

  // TODO: secret scanning on push (beta enterprise feature, can't find API)
  // and any others?

  try {
    await octokit.rest.repos.checkVulnerabilityAlerts(repoDetails);
    logger.good('Vulnerability alerts are enabled');
  } catch (err) {
    const errInfo = processRequestError(err);
    // 404 means either alerts are disabled, or the user doesn't have admin perms.
    // Earlier code should have done the admin check, so we can assume disabled.
    if (errInfo.status === 404) {
      logger.danger('Vulnerability alerts are disabled', { resolveUrl: securityUrl });
    } else {
      logger.unknown('Error checking vulnerability alerts status', { details: errInfo.message });
    }
  }
}
