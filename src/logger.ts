import { RepoDetails } from './types';

export type ResultType = 'good' | 'danger' | 'warning' | 'caution' | 'info' | 'unknown';

export interface ResultLogDetails {
  details?: string;
  resolveUrl?: string;
  docsUrl?: string;
  subLogs?: ResultLogEntry[];
}

export interface ResultLogEntry extends ResultLogDetails {
  type: ResultType;
  message: string;
}

const resultSymbols: { [k in ResultType]: string } = {
  good: '✅',
  danger: '❌',
  warning: '❗️',
  caution: '🔸',
  info: '• ',
  unknown: '❓',
};

const resultSeverity: { [k in ResultType]: number } = {
  good: 0,
  info: 0, // info results are fine
  unknown: 1,
  caution: 2,
  warning: 3,
  danger: 4,
};

function getWorstResult(entries: ResultLogEntry[]) {
  return entries.reduce(
    (worst, entry) => (resultSeverity[entry.type] > resultSeverity[worst] ? entry.type : worst),
    'good' as ResultType,
  );
}

export class ResultLogger {
  private _indent: number = 0;
  private _repo: string | undefined;
  private _logs: Record<string, ResultLogEntry[]> = {};
  private _section: (ResultLogEntry & Required<Pick<ResultLogEntry, 'subLogs'>>) | undefined;

  /** Update the repo currently being logged */
  public setRepo(repoDetails: RepoDetails) {
    this._repo = `${repoDetails.owner}/${repoDetails.repo}`;
    this._logs[this._repo] ??= [];
    this._indent = 0;
    this._section = undefined;
    console.log();
  }

  public setIndent(indent: number) {
    this._indent = indent;
  }

  public repoHeader() {
    if (!this._repo) {
      throw new Error('Repo details not set');
    }
    console.log(`======== ${this._repo} ========\n`);
  }

  public startSection(message: string, details?: Omit<ResultLogDetails, 'subLogs'>) {
    if (this._section) {
      throw new Error('Section already started');
    }
    this._section = { type: 'good', message, subLogs: [] };
  }

  public writeSection() {
    if (!this._section) {
      throw new Error('No section to write');
    }

    let { message, type, ...details } = this._section;
    type = getWorstResult(details.subLogs);
    if (type !== 'good') {
      message += ` (with ${type === 'danger' ? 'issues' : 'possible issues'})`;
    }
    this._log(type, message, details);
    this._section = undefined;
  }

  // /**
  //  * Log the message with the appropriate type (and possibly a "with issues" suffix) based on
  //  * the worst level in `subLogs`.
  //  */
  // public section(
  //   message: string,
  //   subLogs: ResultLogEntry[],
  //   details?: Omit<ResultLogDetails, 'subLogs'>,
  // ) {
  //   const resultType = getWorstResult(subLogs);
  //   if (resultType !== 'good') {
  //     message += ` (with ${resultType === 'danger' ? 'issues' : 'possible issues'})`;
  //   }
  //   this._log(resultType, message, { ...details, subLogs });
  // }

  /** Setting is secure */
  public good(message: string, details?: ResultLogDetails) {
    this._logOrSub('good', message, details);
  }

  /** Issue should be corrected immediately */
  public danger(message: string, details?: ResultLogDetails) {
    this._logOrSub('danger', message, details);
  }

  /** Evaluate possible issue and strongly consider correcting if needed */
  public warning(message: string, details?: ResultLogDetails) {
    this._logOrSub('warning', message, details);
  }

  /** Changing this setting may enhance security */
  public caution(message: string, details?: ResultLogDetails) {
    this._logOrSub('caution', message, details);
  }

  /** Informational point which is less relevant to security */
  public info(message: string, details?: ResultLogDetails) {
    this._logOrSub('info', message, details);
  }

  /** Unexpected result, or failed to check */
  public unknown(message: string, details?: ResultLogDetails) {
    this._logOrSub('unknown', message, details);
  }

  private _logOrSub(type: ResultType, message: string, details?: ResultLogDetails) {
    if (this._section) {
      this._section.subLogs.push({ type, message, ...details });
    } else {
      this._log(type, message, details);
    }
  }

  private _log(type: ResultType, message: string, details?: ResultLogDetails, sub?: boolean) {
    if (!this._repo) {
      throw new Error('Repo details not set');
    }

    const logEntry: ResultLogEntry = {
      type,
      message,
      ...details,
    };
    this._logs[this._repo].push(logEntry);

    const indent = '   '.repeat(this._indent);

    console.log(indent + resultSymbols[type], message);

    if (details?.details) {
      console.log(indent + details.details);
    }
    if (details?.resolveUrl && type !== 'good') {
      console.log(`${indent}(Resolve issues at ${details.resolveUrl})`);
    }
    if (details?.docsUrl) {
      console.log(`${indent}(Docs: ${details.docsUrl})`);
    }
    if (details?.subLogs) {
      let indentNum = this._indent;
      this._indent = indentNum + 1;
      for (const subLog of details.subLogs) {
        this._log(subLog.type, subLog.message, subLog, true);
      }
      this._indent = indentNum;
    }

    !sub && console.log();
  }
}
