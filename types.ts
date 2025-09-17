export interface DaxGenerationResponse {
  dax_formula: string;
  explanation: string;
  optimization_tips: string;
  common_pitfalls: string;
}

export type Page =
  | 'KPIs & DAX'
  | 'Data Upload'
  | 'Data Profiling'
  | 'Data Cleaning'
  | 'Data Modeling'
  | 'Dashboard Design'
  | 'Publish & Share';

// --- Data Profiling Types ---

export interface ColumnProfile {
  name: string;
  dataType: 'string' | 'number' | 'boolean' | 'mixed' | 'unknown';
  missingValues: number;
  uniqueValues: number;
  nonNumericCount?: number;
}

export interface FileProfile {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
}

export interface AIInsights {
    suggested_kpis: string[];
    data_quality_summary: string;
}

export interface FullProfileResult extends FileProfile {
    aiInsights: AIInsights | null;
}

// --- Data Cleaning Types ---
export enum CleaningActionType {
    REMOVE_ROWS = 'REMOVE_ROWS',
    FILL_MEAN = 'FILL_MEAN',
    FILL_MEDIAN = 'FILL_MEDIAN',
    FILL_MODE = 'FILL_MODE',
    FILL_CUSTOM = 'FILL_CUSTOM',
    CHANGE_TYPE = 'CHANGE_TYPE',
    TRIM_WHITESPACE = 'TRIM_WHITESPACE',
}

export interface CleaningSuggestion {
    action: CleaningActionType;
    description: string;
    parameters?: {
        value?: string;
        targetType?: 'string' | 'number';
    };
}

export interface ColumnIssue {
    fileName: string;
    columnName: string;
    issueType: 'missing_values' | 'mixed_type';
    details: {
        missingCount?: number;
        nonNumericCount?: number;
        totalRows: number;
    };
}

export interface AppliedAction {
    file: string;
    column: string;
    suggestion: CleaningSuggestion;
}

// --- Data Modeling Types ---

export type RelationshipType = 'One-to-Many' | 'Many-to-One' | 'One-to-One' | 'Many-to-Many';

export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: RelationshipType;
}

export interface RelationshipSuggestion extends Relationship {
    confidence: 'High' | 'Medium' | 'Low';
    reason: string;
}