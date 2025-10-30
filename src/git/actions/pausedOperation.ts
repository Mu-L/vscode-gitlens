import { window } from 'vscode';
import { executeCommand } from '../../system/-webview/command';
import { PausedOperationContinueError, PausedOperationContinueErrorReason } from '../errors';
import type { GitRepositoryService } from '../gitRepositoryService';
import type { GitPausedOperationStatus } from '../models/pausedOperationStatus';
import { getReferenceLabel } from '../utils/reference.utils';

export async function abortPausedOperation(svc: GitRepositoryService, options?: { quit?: boolean }): Promise<void> {
	try {
		return await svc.pausedOps?.abortPausedOperation?.(options);
	} catch (ex) {
		void window.showErrorMessage(ex.message);
	}
}

export async function continuePausedOperation(svc: GitRepositoryService): Promise<void> {
	return continuePausedOperationCore(svc);
}

export async function skipPausedOperation(svc: GitRepositoryService): Promise<void> {
	return continuePausedOperationCore(svc, true);
}

async function continuePausedOperationCore(svc: GitRepositoryService, skip: boolean = false): Promise<void> {
	try {
		return await svc.pausedOps?.continuePausedOperation?.(skip ? { skip: true } : undefined);
	} catch (ex) {
		if (
			ex instanceof PausedOperationContinueError &&
			ex.reason === PausedOperationContinueErrorReason.EmptyCommit
		) {
			// Use the operation status from the error - it's already accurate
			// The previous code tried to wait for a repo change, but that would fire on the
			// change event from the failed continue (not the skip), resulting in stale data
			const operation: GitPausedOperationStatus = ex.operation;

			const pausedAt = getReferenceLabel(operation.incoming, { icon: false, label: true, quoted: true });

			const skip = { title: 'Skip' };
			const cancel = { title: 'Cancel', isCloseAffordance: true };

			// TODO@eamodio: We should offer a continue with allowing an empty commit option

			const result = await window.showInformationMessage(
				`The ${operation.type} operation cannot be continued because ${pausedAt} resulted in an empty commit.\n\nDo you want to skip ${pausedAt}?`,
				{ modal: true },
				skip,
				cancel,
			);
			if (result === skip) {
				return void continuePausedOperationCore(svc, true);
			}

			void executeCommand('gitlens.showCommitsView');

			return;
		}

		void window.showErrorMessage(ex.message);
	}
}
