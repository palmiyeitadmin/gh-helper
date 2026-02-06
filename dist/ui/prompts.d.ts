export declare function promptStageFiles(files: string[]): Promise<string[]>;
export declare function promptCommitMessage(suggestion: string): Promise<string>;
export declare function promptConfirmPush(): Promise<boolean>;
export declare function promptConfirmAction(message: string): Promise<boolean>;
export declare function promptSelectCommitType(): Promise<string>;
export declare function promptCommitScope(): Promise<string | undefined>;
export declare function promptCommitDescription(): Promise<string>;
