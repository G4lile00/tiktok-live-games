/**
 * constants.js
 * Every fixed value used by the game code (no magic numbers elsewhere).
 * Gameplay settings (scores, gifts, phase durations, texts) live in ../config.js.
 *
 * @module games/flavio-vs-lula/constants
 */

/**
 * Round phases. The strings are also the keys of `config.phases` / `config.labels`.
 * @readonly
 * @enum {string}
 */
export const PHASE = Object.freeze({
	WAITING: "waiting",
	COUNTDOWN: "countdown",
	PLAYING: "playing",
	FINISHED: "finished",
	COOLDOWN: "cooldown",
});

/** Phases in which gifts / chat votes add points. */
export const SCORING_PHASES = Object.freeze([PHASE.COUNTDOWN, PHASE.PLAYING]);

/** Kinds of scoring events. */
export const EVENT_TYPE = Object.freeze({
	GIFT: "gift",
	VOTE: "vote",
	CHAT: "chat",
});

/** Index of each side in `config.sides`. */
export const SIDE = Object.freeze({ LEFT: 0, RIGHT: 1 });

/** Color of the "who is ahead" pill while the score is tied. */
export const NEUTRAL_COLOR = "#5b6b8c";

/** How many recent engine events are kept for the feed. */
export const MAX_RECENT_EVENTS = 20;

/** Displayed values easing toward the real ones (per animation frame). */
export const EASING = Object.freeze({
	/** Fraction of the remaining distance a counter covers per frame. */
	score: 0.15,
	/** Same, for the left side share (progress bars / percentages). */
	share: 0.08,
	/** Below this distance the counter snaps to the real score. */
	snapDistance: 0.5,
	/** Share shown before anybody has scored. */
	initialShare: 0.5,
});

/** Event feed. */
export const FEED = Object.freeze({
	/** Lines visible at once (newest on top). */
	visibleEvents: 3,
});

/** Floating "+N" popups drawn on the canvas. */
export const POPUP = Object.freeze({
	/** Life lost per frame (1 → 0). */
	lifePerFrame: 0.016,
	/** Font size as a fraction of the score element height. */
	sizeRatio: 0.2,
	minSize: 16,
	/** Horizontal random offset as a fraction of the score element width. */
	jitterRatio: 0.5,
	/** Vertical start as a fraction of the score element height. */
	startYRatio: 0.55,
	/** Upward speed (px per frame): base + random part. */
	riseBase: 0.8,
	riseRandom: 0.6,
	maxAlpha: 0.7,
	/** Alpha = life × fadeFactor, capped at maxAlpha. */
	fadeFactor: 1.2,
	outlineRatio: 0.15,
	minOutline: 3,
	outlineColor: "rgba(0,0,0,0.55)",
	fillColor: "#fff",
	fontWeight: 900,
	fontFamily: "sans-serif",
	/** Where to spawn when the score element does not exist. */
	fallbackRect: Object.freeze({ left: 200, width: 200, top: 300, height: 100 }),
});

/** Urna (voting machine) animation. */
export const URN_STATE = Object.freeze({
	IDLE: "idle",
	TYPING: "typing",
	CONFIRM: "confirm",
	DONE: "done",
});

export const URN = Object.freeze({
	/** Votes waiting to be animated per urna (older ones are dropped; score is unaffected). */
	maxQueue: 8,
	/** Duration of each step of one vote, in ms (multiplied by the speed below). */
	stepMs: Object.freeze({ move: 150, digit: 170, confirm: 260, done: 520 }),
	/** How long a pressed key stays highlighted. */
	tapMs: 110,
	/** Animation speed factor depending on how many votes are waiting. */
	speed: Object.freeze({ normal: 1, medium: 0.7, fast: 0.4 }),
	/** Backlog sizes (votes waiting) that switch to the faster speeds. */
	mediumBacklog: 1,
	fastBacklog: 3,
	/** Keys drawn on the keypad, in DOM order. */
	keys: "1234567890",
	/** The hand points at this fraction of the key height (0 = top). */
	keyTargetY: 0.55,
});

/** Typing hand geometry (relative to the hand SVG). */
export const HAND = Object.freeze({
	/** Fingertip position as a fraction of the SVG width / height. */
	tipX: 23.5 / 60,
	tipY: 4 / 130,
	/** Resting spot: right edge of the keypad (minus this fraction of the hand width)… */
	restInsetX: 0.15,
	/** …and this fraction of the urn height (the arm is cut by the urn bottom). */
	restY: 0.92,
});

/** Number formatting for the overlay texts. */
export const LOCALE = "pt-BR";
