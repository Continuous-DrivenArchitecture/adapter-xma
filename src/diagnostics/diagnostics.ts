export type XmaDiagnosticSeverity = 'error' | 'warning';

export interface XmaDiagnostic {
  /** Stable machine-readable code, e.g. "unsupported-element-type". */
  code: string;
  severity: XmaDiagnosticSeverity;
  message: string;
  /** Id of the offending source entity (Archi element/relationship/view/diagram id), when applicable. */
  entityId?: string;
  /** Kind of the offending source entity, e.g. "ArchiElement", "ArchiRelationship". */
  entityType?: string;
}

/** Accumulates diagnostics during a single serialization pass. */
export class DiagnosticCollector {
  private readonly items: XmaDiagnostic[] = [];

  error(diagnostic: Omit<XmaDiagnostic, 'severity'>): void {
    this.items.push({ ...diagnostic, severity: 'error' });
  }

  warning(diagnostic: Omit<XmaDiagnostic, 'severity'>): void {
    this.items.push({ ...diagnostic, severity: 'warning' });
  }

  get all(): XmaDiagnostic[] {
    return [...this.items];
  }

  get hasErrors(): boolean {
    return this.items.some((d) => d.severity === 'error');
  }
}
