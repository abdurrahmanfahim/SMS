/** Machine-readable reason for a {@link ResultsError}. */
export type ResultsErrorCode =
  | "invalid_config"
  | "invalid_input"
  | "bands_overlap"
  | "bands_gap"
  | "band_out_of_range"
  | "duplicate_id"
  | "unknown_reference"
  | "unknown_group_code"
  | "mark_out_of_range"
  | "missing_marks"
  | "no_counted_subjects"
  | "no_compulsory_subjects";

/**
 * A user-caused problem found in a grade scheme, an exam definition or entered marks. The engine
 * returns these as values (see {@link EngineResult}); it never throws for bad user data.
 */
export type ResultsError = {
  readonly code: ResultsErrorCode;
  /** Dot-separated location inside the input, for example `scheme.bands.2.min`; may be empty. */
  readonly path: string;
  /** Plain-English explanation meant to be shown to an administrator or logged. */
  readonly message: string;
};

/** Success value or a non-empty list of {@link ResultsError}s. */
export type EngineResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly ResultsError[] };

/** Wraps a value as a successful {@link EngineResult}. */
export function succeed<T>(value: T): EngineResult<T> {
  return { ok: true, value };
}

/** Wraps errors as a failed {@link EngineResult}. */
export function failWith<T = never>(errors: readonly ResultsError[]): EngineResult<T> {
  return { ok: false, errors };
}
