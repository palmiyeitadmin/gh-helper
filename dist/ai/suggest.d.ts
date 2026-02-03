interface CommitSuggestion {
    type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore' | 'perf' | 'build' | 'ci';
    scope?: string;
    message: string;
    fullMessage: string;
    isAI: boolean;
}
export declare function generateAICommitSuggestion(): Promise<{
    suggestion: string | null;
    error?: string;
}>;
export declare function generateCommitSuggestion(): Promise<CommitSuggestion>;
export declare function getCommitTypes(): {
    value: string;
    name: string;
}[];
export declare function formatConventionalCommit(type: string, scope: string | undefined, message: string): string;
export {};
