# repo-scanner

Tool for scanning GitHub repo configuration for potential security concerns.

Note that **you must be a repo admin** for this to work.

To try it out before the package is published:

1. Clone the repo
2. Create a PAT with at least `repo` scope and save it as `GITHUB_TOKEN` in a `.env` file at the repo root (or pass it on the command line)
   ```
   GITHUB_TOKEN=<your PAT>
   ```
3. Build and run
   ```
   yarn
   yarn build
   yarn scan <owner/repo>
   ```
