import { html as html2, parse as parseDiff } from 'diff2html';
import type { RawTemplates } from 'diff2html/lib-esm/hoganjs-utils';
import type { DiffFile } from 'diff2html/lib-esm/types';
import { ColorSchemeType } from 'diff2html/lib-esm/types';
import type { Diff2HtmlUIConfig } from 'diff2html/lib-esm/ui/js/diff2html-ui.js';
import { Diff2HtmlUI } from 'diff2html/lib-esm/ui/js/diff2html-ui.js';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { ComposerHunk } from '../../../../../plus/composer/protocol';
import { focusableBaseStyles } from '../../../../shared/components/styles/lit/a11y.css';
import { boxSizingBase } from '../../../../shared/components/styles/lit/base.css';
import {
	blockHeaderTemplate,
	genericFilePathTemplate,
	lineByLineFileTemplate,
	sideBySideFileTemplate,
} from './diff-templates';
import { diff2htmlStyles, diffStyles, hljsStyles } from './diff.css';
import '../../../../shared/components/code-icon';

@customElement('gl-diff-file')
export class GlDiffFile extends LitElement {
	static override styles = [
		boxSizingBase,
		focusableBaseStyles,
		css`
			[hidden] {
				display: none !important;
			}

			:host {
				display: block;
			}
		`,
		hljsStyles,
		diff2htmlStyles,
		diffStyles,
	];

	@property({ type: String })
	filename?: string;

	@property({ type: Array })
	hunks?: ComposerHunk[];

	@property({ type: Boolean, attribute: 'side-by-side' })
	sideBySide = false;

	@query('#diff')
	targetElement!: HTMLDivElement;

	@state()
	private diffText?: string;

	@state()
	private parsedDiff?: DiffFile[];

	get rawTemplates(): RawTemplates {
		return {
			'block-header': blockHeaderTemplate,
			'line-by-line-file-diff': lineByLineFileTemplate,
			'side-by-side-file-diff': sideBySideFileTemplate,
			'generic-file-path': genericFilePathTemplate,
		};
	}

	private diff2htmlUi?: Diff2HtmlUI;

	override firstUpdated() {
		this.processDiff();
		this.renderDiff();
	}

	override updated(changedProperties: Map<string | number | symbol, unknown>) {
		super.updated(changedProperties);
		if (changedProperties.has('filename') || changedProperties.has('hunks')) {
			this.processDiff();
		}
		if (changedProperties.has('diffText')) {
			this.renderDiff();
		}
	}

	override render() {
		return html`<div id="diff"></div>`;
	}
	// override render() {
	// 	return this.renderDiff2();
	// }

	private renderDiff() {
		if (!this.parsedDiff) {
			this.targetElement.innerHTML = '';
			return;
		}
		const config: Diff2HtmlUIConfig = {
			colorScheme: ColorSchemeType.AUTO,
			outputFormat: this.sideBySide ? 'side-by-side' : 'line-by-line',
			drawFileList: false,
			highlight: false,
			rawTemplates: this.rawTemplates,
		};
		this.diff2htmlUi = new Diff2HtmlUI(this.targetElement, this.parsedDiff, config);
		this.diff2htmlUi.draw();
		// this.diff2htmlUi.highlightCode();
	}

	private renderDiff2() {
		if (!this.diffText) {
			return nothing;
		}

		const html = html2(this.diffText, {
			drawFileList: false,
			// matching: 'lines',
			outputFormat: 'line-by-line',
			// colorScheme: this.isDarkMode ? ColorSchemeType.DARK : ColorSchemeType.LIGHT,
			colorScheme: ColorSchemeType.AUTO,
		});

		return unsafeHTML(html);
	}

	private processDiff() {
		// create diff text, then call parseDiff
		if (!this.filename || !this.hunks || this.hunks.length === 0) {
			this.diffText = undefined;
			this.parsedDiff = undefined;
			return;
		}
		const diffLines = this.hunks
			.map((hunk, i) => {
				if (i === 0) {
					return `${hunk.diffHeader}\n${hunk.hunkHeader}\n${hunk.content}`;
				}
				return `\n${hunk.hunkHeader}\n${hunk.content}`;
			})
			.join('\n');

		this.diffText = diffLines.trim();
		const parsedDiff = parseDiff(this.diffText);
		this.parsedDiff = parsedDiff;
	}
}
