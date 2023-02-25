/**
 * Returns info from the error if it's a github request error, or undefined if not.
 */
export function processRequestError(err: unknown) {
  if ((err as any)?.name === 'RequestError' || (err as any)?.constructor?.name === 'RequestError') {
    // Definition for this error: https://www.npmjs.com/package/@octokit/request-error
    const reqError = err as Error & {
      status: number;
      // 404 responses commonly include a documentation_url
      response?: { data?: { documentation_url?: string } };
    };
    return {
      message: reqError.message,
      status: reqError.status,
      docUrl: reqError.response?.data?.documentation_url,
    };
  }
}
