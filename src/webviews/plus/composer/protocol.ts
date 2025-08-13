import type { Sources } from '../../../constants.telemetry';
import type { AIModel } from '../../../plus/ai/models/model';
import type { IpcScope, WebviewState } from '../../protocol';
import { IpcCommand, IpcNotification } from '../../protocol';

export const scope: IpcScope = 'composer';

export const currentOnboardingVersion = '1.0.0'; // Update this when onboarding changes

export interface ComposerHunk {
	index: number; // Unique hunk index (1-based to match hunkMap)
	fileName: string;
	diffHeader: string; // Git diff header (e.g., "diff --git a/file.ts b/file.ts")
	hunkHeader: string; // Hunk header (e.g., "@@ -1,5 +1,7 @@") or "rename" for rename hunks
	content: string; // The actual diff content (lines starting with +, -, or space) or rename info
	additions: number;
	deletions: number;
	source: 'staged' | 'unstaged' | 'commits' | string; // commit SHA or source type
	assigned?: boolean; // True when this hunk's index is in any commit's hunkIndices array
	isRename?: boolean; // True for rename-only hunks
	originalFileName?: string; // Original filename for renames
}

export interface ComposerCommit {
	id: string;
	message: string;
	sha?: string; // Optional SHA for existing commits
	aiExplanation?: string;
	hunkIndices: number[]; // References to hunk indices in the hunk map
}

// Remove callbacks - use IPC instead

export interface ComposerHunkMap {
	index: number;
	hunkHeader: string;
}

export interface ComposerBaseCommit {
	sha: string;
	message: string;
	repoName: string;
	branchName: string;
}

export interface ComposerSafetyState {
	repoPath: string;
	headSha: string;
	branchName: string;
	branchRefSha: string;
	worktreeName: string;
	stagedDiff: string | null; // null if no staged changes when composer opened
	unstagedDiff: string | null; // null if no unstaged changes when composer opened
	timestamp: number;
}

export interface State extends WebviewState {
	// data model
	hunks: ComposerHunk[];
	commits: ComposerCommit[];
	hunkMap: ComposerHunkMap[];
	baseCommit: ComposerBaseCommit;
	safetyState: ComposerSafetyState;

	// UI state
	selectedCommitId: string | null;
	selectedCommitIds: Set<string>;
	selectedUnassignedSection: string | null;
	selectedHunkIds: Set<string>;
	detailsSectionExpanded: {
		commitMessage: boolean;
		aiExplanation: boolean;
		filesChanged: boolean;
	};
	generatingCommits: boolean;
	generatingCommitMessage: string | null; // commitId of the commit currently generating a message, or null
	committing: boolean; // true when finish and commit is in progress
	safetyError: string | null; // error message if safety validation failed, or null
	loadingError: string | null; // error message if there was an error loading the webview, or null
	aiOperationError: { operation: string; error?: string } | null; // error message if AI operation failed, or null

	// AI composition state
	hasUsedAutoCompose: boolean; // true if auto-compose has been successfully used at least once

	// Content state
	hasChanges: boolean; // true if there are working directory changes to compose

	// Mode controls
	mode: 'experimental' | 'preview'; // experimental = normal mode, preview = locked AI preview mode

	// AI settings
	aiEnabled: {
		org: boolean;
		config: boolean;
	};
	ai: {
		model: AIModel | undefined;
	};
	onboardingDismissed: boolean;
}

export const initialState: Omit<State, keyof WebviewState> = {
	hunks: [],
	commits: [],
	hunkMap: [],
	baseCommit: {
		sha: '',
		message: '',
		repoName: '',
		branchName: '',
	},
	safetyState: {
		repoPath: '',
		headSha: '',
		branchName: '',
		branchRefSha: '',
		worktreeName: '',
		stagedDiff: null,
		unstagedDiff: null,
		timestamp: 0,
	},
	selectedCommitId: null,
	selectedCommitIds: new Set<string>(),
	selectedUnassignedSection: null,
	selectedHunkIds: new Set<string>(),
	detailsSectionExpanded: {
		commitMessage: true,
		aiExplanation: true,
		filesChanged: true,
	},
	generatingCommits: false,
	generatingCommitMessage: null,
	committing: false,
	safetyError: null,
	loadingError: null,
	aiOperationError: null,
	hasUsedAutoCompose: false,
	hasChanges: true,
	mode: 'preview',
	aiEnabled: {
		org: false,
		config: false,
	},
	ai: {
		model: undefined,
	},
	onboardingDismissed: false,
};

// Commands that can be sent from the webview to the host

export interface GenerateWithAIParams {
	commits: ComposerCommit[];
	unassignedHunkIndices: number[];
}

// Notifications that can be sent from the host to the webview
export interface DidChangeComposerDataParams {
	hunks: ComposerHunk[];
	commits: ComposerCommit[];
	baseCommit: ComposerBaseCommit;
}

// IPC Commands and Notifications
const ipcScope = 'composer';

// Commands sent from webview to host
export const GenerateCommitsCommand = new IpcCommand<GenerateCommitsParams>(ipcScope, 'generateCommits');
export const GenerateCommitMessageCommand = new IpcCommand<GenerateCommitMessageParams>(
	ipcScope,
	'generateCommitMessage',
);
export const FinishAndCommitCommand = new IpcCommand<FinishAndCommitParams>(ipcScope, 'finishAndCommit');
export const CloseComposerCommand = new IpcCommand<void>(ipcScope, 'close');
export const ReloadComposerCommand = new IpcCommand<ReloadComposerParams>(ipcScope, 'reload');
export const CancelGenerateCommitsCommand = new IpcCommand<void>(ipcScope, 'cancelGenerateCommits');
export const CancelGenerateCommitMessageCommand = new IpcCommand<void>(ipcScope, 'cancelGenerateCommitMessage');
export const CancelFinishAndCommitCommand = new IpcCommand<void>(ipcScope, 'cancelFinishAndCommit');
export const ClearAIOperationErrorCommand = new IpcCommand<void>(ipcScope, 'clearAIOperationError');
export const OnSelectAIModelCommand = new IpcCommand<void>(ipcScope, 'selectAIModel');
export interface AIFeedbackParams {
	sessionId: string | null;
}

export const AIFeedbackHelpfulCommand = new IpcCommand<AIFeedbackParams>(ipcScope, 'aiFeedbackHelpful');
export const AIFeedbackUnhelpfulCommand = new IpcCommand<AIFeedbackParams>(ipcScope, 'aiFeedbackUnhelpful');

export const DismissOnboardingCommand = new IpcCommand<void>(ipcScope, 'dismissOnboarding');

// Notifications sent from host to webview
export const DidChangeNotification = new IpcNotification<DidChangeComposerDataParams>(ipcScope, 'didChange');
export const DidStartGeneratingNotification = new IpcNotification<void>(ipcScope, 'didStartGenerating');
export const DidStartGeneratingCommitMessageNotification = new IpcNotification<{ commitId: string }>(
	ipcScope,
	'didStartGeneratingCommitMessage',
);
export const DidGenerateCommitsNotification = new IpcNotification<DidGenerateCommitsParams>(
	ipcScope,
	'didGenerateCommits',
);
export const DidGenerateCommitMessageNotification = new IpcNotification<DidGenerateCommitMessageParams>(
	ipcScope,
	'didGenerateCommitMessage',
);
export const DidStartCommittingNotification = new IpcNotification<void>(ipcScope, 'didStartCommitting');
export const DidFinishCommittingNotification = new IpcNotification<void>(ipcScope, 'didFinishCommitting');
export const DidSafetyErrorNotification = new IpcNotification<DidSafetyErrorParams>(ipcScope, 'didSafetyError');
export const DidReloadComposerNotification = new IpcNotification<DidReloadComposerParams>(
	ipcScope,
	'didReloadComposer',
);
export const DidLoadingErrorNotification = new IpcNotification<DidLoadingErrorParams>(ipcScope, 'didLoadingError');
export const DidCancelGenerateCommitsNotification = new IpcNotification<void>(ipcScope, 'didCancelGenerateCommits');
export const DidCancelGenerateCommitMessageNotification = new IpcNotification<void>(
	ipcScope,
	'didCancelGenerateCommitMessage',
);
export interface DidErrorAIOperationParams {
	operation: string;
	error?: string;
}
export const DidErrorAIOperationNotification = new IpcNotification<DidErrorAIOperationParams>(
	ipcScope,
	'didErrorAIOperation',
);
export const DidClearAIOperationErrorNotification = new IpcNotification<void>(ipcScope, 'didClearAIOperationError');
export const DidChangeAiEnabledNotification = new IpcNotification<DidChangeAiEnabledParams>(
	ipcScope,
	'didChangeAiEnabled',
);
export const DidChangeAiModelNotification = new IpcNotification<DidChangeAiModelParams>(ipcScope, 'didChangeAiModel');

// Parameters for IPC messages
export interface GenerateCommitsParams {
	hunks: ComposerHunk[];
	commits: ComposerCommit[];
	hunkMap: ComposerHunkMap[];
	baseCommit: ComposerBaseCommit;
	customInstructions?: string;
}

export interface GenerateCommitMessageParams {
	commitId: string;
	diff: string;
}

export interface FinishAndCommitParams {
	commits: ComposerCommit[];
	hunks: ComposerHunk[];
	baseCommit: ComposerBaseCommit;
	safetyState: ComposerSafetyState;
}

export interface ReloadComposerParams {
	repoPath: string;
	mode: 'experimental' | 'preview';
	source?: Sources;
}

export interface DidChangeComposerDataParams {
	hunks: ComposerHunk[];
	commits: ComposerCommit[];
	hunkMap: ComposerHunkMap[];
	baseCommit: ComposerBaseCommit;
}

export interface DidGenerateCommitsParams {
	commits: ComposerCommit[];
}

export interface DidGenerateCommitMessageParams {
	commitId: string;
	message: string;
}

export interface DidChangeAiEnabledParams {
	org?: boolean;
	config?: boolean;
}

export interface DidChangeAiModelParams {
	model: AIModel | undefined;
}

export interface DidSafetyErrorParams {
	error: string;
}

export interface DidReloadComposerParams {
	hunks: ComposerHunk[];
	commits: ComposerCommit[];
	hunkMap: ComposerHunkMap[];
	baseCommit: ComposerBaseCommit;
	safetyState: ComposerSafetyState;
	loadingError: string | null;
	hasChanges: boolean;
}

export interface DidLoadingErrorParams {
	error: string;
}
