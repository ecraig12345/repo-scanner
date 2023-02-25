// This is not in the main types file to avoid a circular dep with logger
import { ResultLogger } from '../logger';
import { RepoDetails } from '../types';

export interface CheckParams {
  repoDetails: RepoDetails;
  logger: ResultLogger;
}
