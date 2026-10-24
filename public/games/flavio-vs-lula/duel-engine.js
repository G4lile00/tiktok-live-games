/**
 * duel-engine.js
 * Pure state machine for the Flavio vs Lula gift duel.
 * NO DOM, NO Canvas — just data in, state out.
 * The renderer (game.js) reads state and draws.
 *
 * Phases: WAITING → COUNTDOWN → PLAYING → FINISHED → COOLDOWN → WAITING
 *
 * @module games/flavio-vs-lula/duel-engine
 */

class DuelEngine {
	/**
	 * @param {Object} config - DUEL_CONFIG from config.js
	 */
	constructor(config) {
		this.config = config;
		this.listeners = {};
		this.state = null;
		this.reset();
	}

	// ==========================================
	// STATE
	// ==========================================

	/** Start a fresh round. Round counters and rounds-won survive the reset. */
	reset() {
		const prev = this.state;
		this.state = {
			  phase: "playing",              // <- era "waiting"
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
			recentEvents: [], // last N events for HUD feed
		};
		this._emit("phaseChange", { phase: "playing" });   // <- era "waiting"
	}

	// ==========================================
	// PHASE TRANSITIONS
	// ==========================================

	/** @private */
	_setPhase(nextPhase) {
		this.state.phase = nextPhase;
		this.state.phaseStartedAt = Date.now();
		this._emit("phaseChange", { phase: nextPhase });
	}

	/** Time elapsed in current phase (ms) */
	phaseElapsed() {
		return Date.now() - this.state.phaseStartedAt;
	}

	/** Time remaining in current phase (ms), or Infinity */
	phaseRemaining() {
		const dur = this.config.phases[this.state.phase]?.duration ?? Infinity;
		if (dur === Infinity) return Infinity;
		return Math.max(0, dur - this.phaseElapsed());
	}

	/** Total score of both sides. */
	totalScore() {
		return this.state.sides.reduce((sum, s) => sum + s.score, 0);
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
	 * Returns current state for rendering.
	 */
	tick() {
		const { phase } = this.state;
		const remaining = this.phaseRemaining();

		if (phase === "countdown" && remaining <= 0) {
			this._setPhase("playing");
		} else if (phase === "playing" && remaining <= 0) {
			this._finishRound();
		} else if (phase === "finished" && remaining <= 0) {
			this._setPhase("cooldown");
		} else if (phase === "cooldown" && remaining <= 0) {
			this.state.roundCount++;
			this.reset();
		}

		return this.state;
	}

	// ==========================================
	// EVENT HANDLERS (called by game.js)
	// ==========================================

	/**
	 * Process a gift event. Only mapped gifts score (see config.countUnmappedGifts).
	 * @param {{giftId: number, giftName: string, giftValue: number, user: {uniqueId: string, nickname: string}}} data
	 */
	handleGift(data) {
		const sideIdx = this.config.giftToSide(data.giftName, data.giftId);
		if (sideIdx < 0) return; // gift is not part of the game

		// First valid gift in the lobby starts the countdown (and counts)
		if (this.state.phase === "waiting") {
			this._setPhase("countdown");
		}

		const { phase } = this.state;
		if (phase === "countdown" || phase === "playing") {
			const repeatCount = Math.max(
    1,
    Number(data.repeatCount) || 1
);

const points = this.config.giftToPoints(data.giftValue) * repeatCount;
			this._addScore(sideIdx, points, data.user, {
				giftName: data.giftName,
				giftEmoji: this.config.getGiftEmoji(data.giftName),
			});

			if (phase === "playing") this._checkTarget();
		}
	}

	/**
	 * Process a chat event. Chat votes only score when config.chatPoints > 0.
	 * @param {{user: {uniqueId: string, nickname: string}, comment: string}} data
	 */
handleChat(data) {
    const comment = String(data?.comment ?? "").trim();
    const user = data?.user;

    console.log("[CHAT] Dados recebidos:", data);
    console.log("[CHAT] Comentário:", comment);
    console.log("[CHAT] Pontos configurados:", this.config.chatPoints);

    const sideIdx = this.config.chatToSide(comment);

    console.log("[CHAT] Lado identificado:", sideIdx);

    if (sideIdx < 0 || sideIdx >= this.state.sides.length) {
        console.log("[CHAT] Voto não reconhecido:", comment);
        return;
    }

    const points = Number(this.config.chatPoints) || 0;

    if (points <= 0) {
        console.log("[CHAT] chatPoints é zero.");
        return;
    }

    if (this.state.phase === "waiting") {
        this._setPhase("countdown");
    }

    const { phase } = this.state;

    if (phase !== "countdown" && phase !== "playing") {
        console.log("[CHAT] Fase não permite pontuar:", phase);
        return;
    }

    this._addScore(sideIdx, points, user, {
        giftName: null,
        giftEmoji: "💬",
        isVote: true,
    });

    console.log("[CHAT] Pontuação adicionada:", {
        lado: this.state.sides[sideIdx].name,
        pontos: points,
        placar: this.state.sides.map(side => ({
            name: side.name,
            score: side.score,
        })),
    });

    if (phase === "playing") {
        this._checkTarget();
    }
}
	// ==========================================
	// INTERNAL
	// ==========================================

	/**
	 * Add points to a side and track the supporter's contribution.
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

		this._addRecentEvent({
			type: meta.isVote ? "vote" : "gift",
			nickname: user?.nickname || uid,
			sideIdx,
			sideShort: side.short,
			color: side.color,
			points,
			giftName: meta.giftName || "",
			giftEmoji: meta.giftEmoji,
		});

		this._emit("scoreAdd", { sideIdx, points, side, user });
	}

	/** @private — early finish when targetScore is configured */
	_checkTarget() {
		const target = this.config.targetScore;
		if (!target) return;
		if (this.state.sides.some((s) => s.score >= target)) {
			this._finishRound();
		}
	}

	/** @private — decide the winner (or a tie) and enter FINISHED */
	_finishRound() {
		if (this.state.phase === "finished") return;

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

		this._setPhase("finished");
		this._emit("roundFinished", {
			winner: this.state.winner,
			isTie: this.state.isTie,
		});
	}

	/** @private — keep last 20 events for HUD feed */
	_addRecentEvent(evt) {
		evt.timestamp = Date.now();
		this.state.recentEvents.unshift(evt);
		if (this.state.recentEvents.length > 20) {
			this.state.recentEvents.length = 20;
		}
	}

	// ==========================================
	// EVENT EMITTER (simple)
	// ==========================================

	on(event, fn) {
		(this.listeners[event] ??= []).push(fn);
	}

	_emit(event, data) {
		(this.listeners[event] || []).forEach((fn) => {
			try {
				fn(data);
			} catch (e) {
				console.error(`[DuelEngine] Error in ${event} listener:`, e);
			}
		});
	}
}

// Export for browser global
if (typeof module !== "undefined" && module.exports) {
	module.exports = DuelEngine;
} else {
	window.DuelEngine = DuelEngine;
}
