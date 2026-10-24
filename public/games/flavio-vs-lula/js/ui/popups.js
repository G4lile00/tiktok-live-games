/**
 * popups.js
 * Canvas layer with the floating "+N" that rises from a score counter.
 *
 * @module games/flavio-vs-lula/ui/popups
 */

import { POPUP } from "../constants.js";

/**
 * @typedef {Object} Popup
 * @property {number} x
 * @property {number} y
 * @property {number} size
 * @property {number} vy
 * @property {string} text
 * @property {number} life 1 → 0
 */

/**
 * @param {HTMLCanvasElement} canvas
 */
export function createPopupLayer(canvas) {
	const ctx = canvas.getContext("2d");
	/** @type {Popup[]} */
	const popups = [];

	/** Match the canvas resolution to the window. */
	function resize() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	/**
	 * Start a "+N" over an element (usually the score counter of a side).
	 * @param {Element|null} anchor
	 * @param {string} text
	 */
	function spawnOver(anchor, text) {
		const rect = anchor ? anchor.getBoundingClientRect() : POPUP.fallbackRect;
		const jitter = (Math.random() - 0.5) * rect.width * POPUP.jitterRatio;
		popups.push({
			x: rect.left + rect.width / 2 + jitter,
			y: rect.top + rect.height * POPUP.startYRatio,
			size: Math.max(POPUP.minSize, rect.height * POPUP.sizeRatio),
			vy: -(POPUP.riseBase + Math.random() * POPUP.riseRandom),
			text,
			life: 1,
		});
	}

	/** Remove every popup (new round). */
	function clear() {
		popups.length = 0;
	}

	/** Advance and draw all popups (call once per frame). */
	function draw() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		for (let i = popups.length - 1; i >= 0; i--) {
			const popup = popups[i];
			popup.y += popup.vy;
			popup.life -= POPUP.lifePerFrame;
			if (popup.life <= 0) {
				popups.splice(i, 1);
				continue;
			}
			ctx.globalAlpha = Math.min(POPUP.maxAlpha, popup.life * POPUP.fadeFactor);
			ctx.font = `${POPUP.fontWeight} ${popup.size}px ${POPUP.fontFamily}`;
			ctx.lineWidth = Math.max(POPUP.minOutline, popup.size * POPUP.outlineRatio);
			ctx.strokeStyle = POPUP.outlineColor;
			ctx.strokeText(popup.text, popup.x, popup.y);
			ctx.fillStyle = POPUP.fillColor;
			ctx.fillText(popup.text, popup.x, popup.y);
		}
		ctx.globalAlpha = 1;
	}

	return { resize, spawnOver, clear, draw };
}
