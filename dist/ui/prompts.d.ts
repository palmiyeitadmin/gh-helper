import { GitStatus } from '../git/operations';
export interface MainMenuChoice {
    action: 'commit' | 'commit-push' | 'status' | 'diff' | 'history' | 'stage' | 'pull' | 'branch' | 'stash' | 'tag' | 'merge' | 'remote' | 'exit';
}
export declare function promptMainMenu(status: GitStatus): Promise<MainMenuChoice>;
export declare function promptStageFiles(files: string[]): Promise<string[]>;
export declare function promptCommitMessage(suggestion: string): Promise<string>;
export declare function promptConfirmPush(): Promise<boolean>;
export declare function promptConfirmAction(message: string): Promise<boolean>;
export declare function promptSelectCommitType(): Promise<string>;
export declare function promptCommitScope(): Promise<string | undefined>;
export declare function promptCommitDescription(): Promise<string>;
