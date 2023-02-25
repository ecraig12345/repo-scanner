// this needs to be a type not an interface to satisfy github API constraints
export type RepoDetails = { owner: string; repo: string };

/** CLI options */
export interface Options {
  browser: boolean;
}

/** Helper to extract the return type from an `octokit.rest.*.*` API */
export type GHData<Func extends () => Promise<{ data: unknown }>> = Awaited<
  ReturnType<Func>
>['data'];

export type GHRepoVisibility = 'public' | 'internal' | 'private';
