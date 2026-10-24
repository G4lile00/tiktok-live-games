/**
 * dom.js
 * Looks up every element of index.html once, so the other UI modules never
 * call document.getElementById with loose strings.
 *
 * @module games/flavio-vs-lula/ui/dom
 */

/**
 * @typedef {Object} DuelDom
 * @property {HTMLCanvasElement} canvas
 * @property {HTMLElement} phaseBanner
 * @property {HTMLElement} gameTitle
 * @property {HTMLElement} phaseText
 * @property {HTMLElement} phaseTimer
 * @property {HTMLElement} totalLabel
 * @property {HTMLElement} totalScore
 * @property {HTMLElement} diffLabel
 * @property {HTMLElement} diffScore
 * @property {HTMLElement} leaderPill
 * @property {HTMLElement} sideCards
 * @property {HTMLElement} urns
 * @property {HTMLElement} eventFeed
 * @property {HTMLElement} winnerOverlay
 * @property {HTMLElement} winnerBadge
 * @property {HTMLElement} winnerName
 * @property {HTMLElement} winnerScore
 * @property {HTMLElement} winnerSupporters
 */

/** Element ids used in index.html. */
const ID = Object.freeze({
	canvas: "duelCanvas",
	phaseBanner: "phaseBanner",
	gameTitle: "gameTitle",
	phaseText: "phaseText",
	phaseTimer: "phaseTimer",
	totalLabel: "totalLabel",
	totalScore: "totalScore",
	diffLabel: "diffLabel",
	diffScore: "diffScore",
	leaderPill: "leaderPill",
	sideCards: "sideCards",
	urns: "urns",
	eventFeed: "eventFeed",
	winnerOverlay: "winnerOverlay",
	winnerBadge: "winnerBadge",
	winnerName: "winnerName",
	winnerScore: "winnerScore",
	winnerSupporters: "winnerSupporters",
});

/**
 * @returns {DuelDom}
 * @throws {Error} when an element is missing from index.html
 */
export function getDom() {
	const dom = {};
	for (const [key, id] of Object.entries(ID)) {
		const el = document.getElementById(id);
		if (!el) throw new Error(`[FlavioVsLula] element #${id} not found in index.html`);
		dom[key] = el;
	}
	return /** @type {DuelDom} */ (dom);
}
