/**
 * main.js
 * Entry point of the Flavio vs Lula overlay: builds the engine and the UI
 * modules, connects the TikTok bridge and runs the render loop.
 *
 * Load order (index.html): socket.io → tiktok-bridge.js → config.js (globals),
 * then this file as an ES module.
 *
 * @module games/flavio-vs-lula/main
 */

import { EVENT_TYPE } from "./constants.js";
import { connectBridgeToEngine } from "./bridge/events.js";
import { DuelEngine } from "./engine/duel-engine.js";
import { createEventFeed } from "./ui/event-feed.js";
import { getDom } from "./ui/dom.js";
import { createPhaseBanner } from "./ui/phase-banner.js";
import { createPopupLayer } from "./ui/popups.js";
import { createResultOverlay } from "./ui/result-overlay.js";
import { createSideCards } from "./ui/side-cards.js";
import { createStatusBar } from "./ui/status-bar.js";
import { createUrns } from "./ui/urns.js";
import { createViewState, easeViewState, resetViewState } from "./view-state.js";

/** @typedef {import("./types.js").ScoreAddEvent} ScoreAddEvent */

// ==========================================
// SETUP
// ==========================================
const config = window.DUEL_CONFIG;
const dom = getDom();
const engine = new DuelEngine(config);
const view = createViewState(config);

const popups = createPopupLayer(dom.canvas);
const phaseBanner = createPhaseBanner(dom, config);
const statusBar = createStatusBar(dom, config);
const sideCards = createSideCards(dom.sideCards, config);
const urns = createUrns(dom.urns, config);
const eventFeed = createEventFeed(dom.eventFeed, config);
const resultOverlay = createResultOverlay(dom, config);

popups.resize();
window.addEventListener("resize", () => {
	popups.resize();
	urns.relayout();
});

// ==========================================
// BRIDGE → ENGINE
// ==========================================
connectBridgeToEngine(window.TikTokBridge, engine, config);

// ==========================================
// ENGINE → UI
// ==========================================

/** Every score event: "+N" popup, counter bump, gift counter and urna typing. */
engine.on("scoreAdd", (/** @type {ScoreAddEvent} */ { sideIdx, points, type }) => {
	popups.spawnOver(sideCards.getScoreElement(sideIdx), `+${points}`);
	sideCards.bump(sideIdx);
	if (type === EVENT_TYPE.GIFT) view.presents[sideIdx]++; // chat votes only animate the urna
	urns.enqueueVote(sideIdx, points);
});

/** New round: counters, popups and gift counters start from zero. */
engine.on("roundReset", () => {
	resetViewState(view);
	popups.clear();
});

// ==========================================
// RENDER LOOP
// ==========================================
function frame() {
	const state = engine.tick();

	easeViewState(view, state, engine.getShare());
	popups.draw();

	phaseBanner.update(state, engine.phaseRemaining());
	statusBar.update(state, view);
	sideCards.update(state, view);
	eventFeed.update(state);
	resultOverlay.update(state);

	requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
console.log("[FlavioVsLula] Game loaded, waiting for TikTokBridge connection...");
