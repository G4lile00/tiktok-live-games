/**
 * duel-engine.js
 * Pure state machine for the Flavio vs Lula gift duel.
 * NO DOM, NO Canvas — just data in, state out.
 * The renderer (main.js + ui/) reads the state and draws.
 *
 * Phases: WAITING → COUNTDOWN → PLAYING → FINISHED → COOLDOWN → (new round)
 *
 * Events emitted (see `on`):
 *  - "phaseChange"   { phase }
 *  - "roundReset"    { phase }            a fresh round just started
 *  - "scoreAdd"      ScoreAddEvent        points were added to a side
 *  - "roundFinished" { winner, isTie }
 *
 * @module games/flavio-vs-lula/engine/duel-engine
 */

import { EVENT_TYPE, MAX_RECENT_EVENTS, PHASE, SCORING_PHASES } from "../constants.js";
import { createLogger } from "../lib/logger.js";

/** @typedef {import("../types.js").DuelState} DuelState */
/** @typedef {import("../types.js").GiftEvent} GiftEvent */
/** @typedef {import("../types.js").ChatEvent} ChatEvent */

export class DuelEngine {
	/**
	 * @param {Object} config DUEL_CONFIG from config.js
	 */
	constructor(config) {
		/** @type {Object} */
		this.config = config;
		/** @type {Record<string, Function[]>} */
		this.listeners = {};
		/** @type {DuelState|null} */
		this.state = null;
		this.logger = createLogger("DUEL", Boolean(config.debug));
		this.reset();
	}

	// ==========================================
	// STATE
	// ==========================================

	/** Start a fresh round. Round counters and rounds-won survive the reset. */
	reset() {
		const prev = this.state;
		const phase = this.config.initialPhase || PHASE.WAITING;

		this.state = {
			phase,
			phaseStartedAt: Date.now(),
			sides: this.config.sides.map((side) => ({
				...side,
				score: side.startScore || 0,
				supporters: new Map(), // uniqueId → { nickname, totalContrib }
			})),
			winner: null, // winning side object, or null
			isTie: false,
			roundCount: prev?.roundCount || 0,
			roundsWon: prev?.roundsWon || this.config.sides.map(() => 0),
			recentEvents: [], // last MAX_RECENT_EVENTS events for the feed
		};

		this._emit("phaseChange", { phase });
		this._emit("roundReset", { phase });
	}

	// ==========================================
	// PHASE TRANSITIONS
	// ==========================================

	/**
	 * @param {string} nextPhase One of PHASE.
	 * @private
	 */
	_setPhase(nextPhase) {
		this.state.phase = nextPhase;
		this.state.phaseStartedAt = Date.now();
		this._emit("phaseChange", { phase: nextPhase });
	}

	/** Time elapsed in the current phase (ms). */
	phaseElapsed() {
		return Date.now() - this.state.phaseStartedAt;
	}

	/** Time remaining in the current phase (ms), or Infinity. */
	phaseRemaining() {
		const duration = this.config.phases[this.state.phase]?.duration ?? Infinity;
		if (duration === Infinity) return Infinity;
		return Math.max(0, duration - this.phaseElapsed());
	}

	/** Total score of both sides. */
	totalScore() {
		return this.state.sides.reduce((sum, side) => sum + side.score, 0);
	}

	/**
	 * Share of the left side (index 0) from 0 to 1.
	 * Returns 0.5 while nobody has scored.
	 */
	getShare() {
		const total = this.totalScore();
		if (total === 0) return 0.5;
		return this.state.sides[0].score / total;
	}

	// ==========================================
	// TICK — call from requestAnimationFrame
	// ==========================================

	/**
	 * Main update tick. Handles phase timeouts / auto-transitions.
	 * @returns {DuelState} current state for rendering
	 */
	tick() {
		const { phase } = this.state;
		const remaining = this.phaseRemaining();

		if (phase === PHASE.COUNTDOWN && remaining <= 0) {
			this._setPhase(PHASE.PLAYING);
		} else if (phase === PHASE.PLAYING && remaining <= 0) {
			this._finishRound();
		} else if (phase === PHASE.FINISHED && remaining <= 0) {
			this._setPhase(PHASE.COOLDOWN);
		} else if (phase === PHASE.COOLDOWN && remaining <= 0) {
			this.state.roundCount++;
			this.reset();
		}

		return this.state;
	}

	// ==========================================
	// EVENT HANDLERS (called by bridge/events.js)
	// ==========================================

	/**
	 * Process a gift event. Only mapped gifts score (see config.countUnmappedGifts).
	 * Points = config.giftToPoints(...) — diamonds × pointsPerDiamond × combo × giftMultiplier.
	 * @param {GiftEvent} data
	 */
	handleGift(data) {
		const sideIdx = this.config.giftToSide(data.giftName, data.giftId);
		if (sideIdx < 0) return; // gift is not part of the game

		// First valid gift in the lobby starts the countdown (and counts)
		if (this.state.phase === PHASE.WAITING) {
			this._setPhase(PHASE.COUNTDOWN);
		}

		const { phase } = this.state;
		if (!SCORING_PHASES.includes(phase)) return;

		const points = this.config.giftToPoints(data.giftValue, data.repeatCount);
		if (points <= 0) return; // e.g. giftMultiplier = 0

		this._addScore(sideIdx, points, data.user, {
			giftName: data.giftName,
			giftEmoji: this.config.getGiftEmoji(data.giftName),
		});

		if (phase === PHASE.PLAYING) this._checkTarget();
	}

	/**
	 * Process a chat event. Chat votes only score when config.chatPoints > 0.
	 * Chat votes are NOT affected by config.giftMultiplier.
	 * @param {ChatEvent} data
	 */
	handleChat(data) {
		const comment = String(data?.comment ?? "").trim();
		const user = data?.user;

		this.logger.log("Chat recebido:", comment, "| chatPoints:", this.config.chatPoints);

		const sideIdx = this.config.chatToSide(comment);
		if (sideIdx < 0 || sideIdx >= this.state.sides.length) {
			this.logger.log("Voto não reconhecido:", comment);
			return;
		}

		const points = Number(this.config.chatPoints) || 0;
		if (points <= 0) {
			this.logger.log("chatPoints é zero.");
			return;
		}

		if (this.state.phase === PHASE.WAITING) {
			this._setPhase(PHASE.COUNTDOWN);
		}

		const { phase } = this.state;
		if (!SCORING_PHASES.includes(phase)) {
			this.logger.log("Fase não permite pontuar:", phase);
			return;
		}

		this._addScore(sideIdx, points, user, {
			giftName: null,
			giftEmoji: "💬",
			isVote: true,
		});

		this.logger.log("Pontuação adicionada:", {
			lado: this.state.sides[sideIdx].name,
			pontos: points,
			placar: this.state.sides.map((side) => ({ name: side.name, score: side.score })),
		});

		if (phase === PHASE.PLAYING) this._checkTarget();
	}

	// ==========================================
	// INTERNAL
	// ==========================================

	/**
	 * Add points to a side and track the supporter's contribution.
	 * @param {number} sideIdx
	 * @param {number} points  Final points (multiplier already applied).
	 * @param {{uniqueId?: string, nickname?: string}|undefined} user
	 * @param {{giftName: string|null, giftEmoji: string, isVote?: boolean}} meta
	 * @private
	 */
	_addScore(sideIdx, points, user, meta) {
		const side = this.state.sides[sideIdx];
		if (!side) return;

		side.score += points;

		const uid = user?.uniqueId || "anonymous";
		const existing = side.supporters.get(uid);
		if (existing) {
			existing.totalContrib += points;
		} else {
			side.supporters.set(uid, {
				nickname: user?.nickname || uid,
				totalContrib: points,
			});
		}

		const type = meta.isVote ? EVENT_TYPE.VOTE : EVENT_TYPE.GIFT;

		this._addRecentEvent({
			type,
			nickname: user?.nickname || uid,
			sideIdx,
			sideShort: side.short,
			color: side.color,
			points,
			giftName: meta.giftName || "",
			giftEmoji: meta.giftEmoji,
		});

		this._emit("scoreAdd", { sideIdx, points, side, user, type });
	}

	/** Early finish when targetScore is configured. @private */
	_checkTarget() {
		const target = this.config.targetScore;
		if (!target) return;
		if (this.state.sides.some((side) => side.score >= target)) {
			this._finishRound();
		}
	}

	/** Decide the winner (or a tie) and enter FINISHED. @private */
	_finishRound() {
		if (this.state.phase === PHASE.FINISHED) return;

		const [a, b] = this.state.sides;
		if (a.score === b.score) {
			this.state.winner = null;
			this.state.isTie = true;
		} else {
			const winner = a.score > b.score ? a : b;
			this.state.winner = winner;
			this.state.isTie = false;
			this.state.roundsWon[winner.id]++;
		}

		this._setPhase(PHASE.FINISHED);
		this._emit("roundFinished", {
			winner: this.state.winner,
			isTie: this.state.isTie,
		});
	}

	/**
	 * Keep the last MAX_RECENT_EVENTS events for the HUD feed.
	 * @param {Object} evt
	 * @private
	 */
	_addRecentEvent(evt) {
		evt.timestamp = Date.now();
		this.state.recentEvents.unshift(evt);
		if (this.state.recentEvents.length > MAX_RECENT_EVENTS) {
			this.state.recentEvents.length = MAX_RECENT_EVENTS;
		}
	}

	// ==========================================
	// EVENT EMITTER (simple)
	// ==========================================

	/**
	 * @param {string} event
	 * @param {(payload: any) => void} fn
	 */
	on(event, fn) {
		(this.listeners[event] ??= []).push(fn);
	}

	/**
	 * @param {string} event
	 * @param {unknown} data
	 * @private
	 */
	_emit(event, data) {
		(this.listeners[event] || []).forEach((fn) => {
			try {
				fn(data);
			} catch (e) {
				this.logger.error(`Error in ${event} listener:`, e);
			}
		});
	}
}
