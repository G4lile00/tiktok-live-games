/**
 * config.js
 * Flavio vs Lula (gift duel) game configuration.
 *
 * HOW IT WORKS:
 * - Two sides face each other. Each side has a live score counter on top.
 * - Each side is powered by its own gifts (one gift per side in every tier,
 *   so both sides have equally priced gifts available).
 * - Gift value (diamonds) becomes points for the side the gift is mapped to.
 * - A round lasts `phases.playing.duration`; highest score wins the round.
 *
 * CUSTOMIZING:
 * - Use debug.html to discover the exact gift names from your TikTok stream.
 * - Edit `giftTiers` so the gifts match what your audience can send.
 * - Edit `labels` to change any text shown on the overlay (pt-BR by default).
 * - Optional: set `photo` on a side to show an image instead of the initial.
 *
 * @module games/flavio-vs-lula/config
 */

const CONFIG = {
	// ==========================================
	// SIDES (exactly 2: index 0 = left, index 1 = right)
	// ==========================================
	sides: [
		{
			id: 0,
			name: "Bolsonaro",
			short: "Flávio",
			/** Candidate number typed on the voting machine (urna). */
			number: "22",
			color: "#1f6bff",
			/** Optional image URL for the avatar. Empty = show the initial letter. */
			photo: "img/Bolsonaro.jpg",
			startScore: 12,   // <- começa com 10
			/** Chat words that vote for this side (accents/case are ignored). */
			aliases: ["1", "flavio", "flavio bolsonaro", "bolsonaro", "22", "pl"],
		},
		{
			id: 1,
			name: "Lula",
			short: "Lula",
			number: "13",
			color: "#e5222f",
			photo: "img/Lula.jpeg",
			startScore: 25,   // <- começa com 10
			aliases: ["2", "lula", "pt", "13"],
		},
	],

	// ==========================================
	// TEXTS (pt-BR) — change freely
	// ==========================================
	labels: {
		title: "DUELO DE PRESENTES",
		waiting: "Mande um presente para começar!",
		countdown: "A rodada começa em",
		playing: "VALENDO! Mande presentes!",
		finished: "FIM DA RODADA!",
		cooldown: "Próxima rodada em instantes...",
		tie: "EMPATE!",
		wins: "venceu a rodada!",
		points: "pts",
		rounds: "Rodadas",
		voteHint: (n) => `Digite ${n} no chat`,
		topSupporters: "Maiores apoiadores:",
		// Scoreboard + urna (voting machine) visual
		total: "TOTAL",
		diff: "DIFERENÇA",
		leading: "NA FRENTE",
		scoreLabel: "PONTOS",
		presents: "presentes",
		voteFor: "SEU VOTO PARA",
		numberHint: "número",
		confirmHint: "CONFIRMA para confirmar",
		end: "FIM",
		confirmed: "CONFIRMADO",
		pointWord: (n) => (n === 1 ? "ponto" : "pontos"),
		btnBlank: "BRANCO",
		btnFix: "CORRIGE",
		btnConfirm: "CONFIRMA",
		urnBrand: "URNA CHICKEN FLOW",
	},

	// ==========================================
	// GIFT → SIDE MAPPING (by value tier)
	// Each tier: equally priced gifts, one per side.
	// Array index = side index (0 = left, 1 = right).
	// ==========================================
	giftTiers: [
		{
			coins: 1,
			gifts: [
				{ name: "Rose", emoji: "🌹" },
				{ name: "Finger Heart", emoji: "🫰" },
			],
		},
		{
			coins: 5,
			gifts: [
				{ name: "Hand Heart", emoji: "💕" },
				{ name: "Little Crown", emoji: "👑" },
			],
		},
		{
			coins: 10,
			gifts: [
				{ name: "Perfume", emoji: "💐" },
				{ name: "Doughnut", emoji: "🍩" },
			],
		},
		{
			coins: 99,
			gifts: [
				{ name: "Garland", emoji: "🏵️" },
				{ name: "Singing Mic", emoji: "🎤" },
			],
		},
	],

	// ==========================================
	// SCORING
	// ==========================================
	/** Points per diamond of a mapped gift (1 gift of 10 diamonds = 10 points). */
	pointsPerDiamond: 1,

	/**
	 * Gift multiplier: the points of a gift are multiplied by this value BEFORE
	 * being added to the side's score.
	 *   points = diamonds × pointsPerDiamond × combo (repeatCount) × giftMultiplier
	 * Examples: 1 = normal · 2 = gifts count double · 0.5 = half · 0 = gifts do not score.
	 * Chat votes (`chatPoints`) are NOT affected. The result is rounded to an integer
	 * (minimum 1 point while the multiplier is above 0).
	 */
	giftMultiplier: 1,

	/**
	 * Gifts that are NOT in `giftTiers`:
	 * false = ignored (only the chosen gifts score).
	 * true  = scored for a side picked by giftId parity.
	 */
	countUnmappedGifts: false,

	/** Points given by a chat vote ("1", "2", "lula"...). 0 = chat does not score. */
	chatPoints: 1,

	/** Optional: first side to reach this score wins the round early. null = off. */
	targetScore: null,

	/** Show viewers' chat messages / likes in the feed (off: avoids showing random text). */
	showChatInFeed: false,

	// ==========================================
	// ROUND PHASES & TIMING (ms)
	// ==========================================
	/**
	 * Phase a round starts in.
	 * "playing" = the round is live right away (default).
	 * "waiting" = lobby; the first valid gift starts the countdown.
	 */
	initialPhase: "playing",

	/** Log gifts / chat votes in the browser console (F12). */
	debug: true,

	phases: {
		/** WAITING — lobby, first valid gift starts the countdown */
		waiting: { duration: Infinity },
		/** COUNTDOWN — 10s before the round (gifts already count) */
		countdown: { duration: 10_000 },
		/** PLAYING — highest score at the end wins */
		playing: { duration: 1_800_000 },
		/** FINISHED — show the result for 8s */
		finished: { duration: 8_000 },
		/** COOLDOWN — brief pause, then scores reset */
		cooldown: { duration: 8_000 },
	},

	/**
	 * Multiplier applied to gift points (invalid or negative values fall back to 1).
	 * @returns {number}
	 */
	getGiftMultiplier() {
		const multiplier = Number(this.giftMultiplier);
		return Number.isFinite(multiplier) && multiplier >= 0 ? multiplier : 1;
	},

	/**
	 * Convert a gift into the points that will be added to the score:
	 * (diamonds × pointsPerDiamond × combo) × giftMultiplier.
	 * @param {number} giftValue   Diamonds of ONE unit of the gift.
	 * @param {number} [repeatCount=1] Combo size (how many units were sent).
	 * @returns {number} Integer points; 0 only when giftMultiplier is 0.
	 */
	giftToPoints(giftValue, repeatCount = 1) {
		const multiplier = this.getGiftMultiplier();
		if (multiplier === 0) return 0;

		const unitPoints = Math.max(1, Math.round((giftValue || 1) * this.pointsPerDiamond));
		const units = Math.max(1, Number(repeatCount) || 1);
		return Math.max(1, Math.round(unitPoints * units * multiplier));
	},

	/**
	 * Resolve gift → side index.
	 * Priority: 1) giftName match in tier map, 2) giftId parity (if enabled).
	 * @returns {number} side index or -1 if the gift does not score
	 */
	giftToSide(giftName, giftId) {
		if (!this._giftNameMap) {
			this._giftNameMap = {};
			for (const tier of this.giftTiers) {
				tier.gifts.forEach((g, idx) => {
					this._giftNameMap[g.name.toLowerCase()] = idx;
				});
			}
		}
		const key = (giftName || "").toLowerCase();
		if (key && this._giftNameMap[key] !== undefined) {
			return this._giftNameMap[key];
		}
		if (this.countUnmappedGifts) {
			return Math.abs(giftId || 0) % this.sides.length;
		}
		return -1;
	},

	/** Get gift emoji by name (for the feed). */
	getGiftEmoji(giftName) {
		if (!this._giftEmojiMap) {
			this._giftEmojiMap = {};
			for (const tier of this.giftTiers) {
				for (const g of tier.gifts) {
					this._giftEmojiMap[g.name.toLowerCase()] = g.emoji;
				}
			}
		}
		return this._giftEmojiMap[(giftName || "").toLowerCase()] || "🎁";
	},

	/**
	 * Gifts of one side, one per tier (for the on-screen legend).
	 * @param {number} sideIdx
	 * @returns {{emoji: string, name: string, coins: number}[]}
	 */
	getSideGifts(sideIdx) {
		return this.giftTiers
			.map((tier) => {
				const g = tier.gifts[sideIdx];
				return g ? { emoji: g.emoji, name: g.name, coins: tier.coins } : null;
			})
			.filter(Boolean);
	},

	/**
	 * Chat-based side selection (case and accents ignored).
	 * @returns {number} side index or -1 if no match
	 */
	chatToSide(comment) {
		const text = this._normalize(comment);
		if (!text) return -1;

		if (!this._chatAliasMap) {
			this._chatAliasMap = {};
			for (const side of this.sides) {
				this._chatAliasMap[this._normalize(side.name)] = side.id;
				for (const alias of side.aliases || []) {
					this._chatAliasMap[this._normalize(alias)] = side.id;
				}
			}
		}
		return this._chatAliasMap[text] ?? -1;
	},

	/** @private lowercase + trim + strip accents */
	_normalize(str) {
		return (str || "")
			.toString()
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.toLowerCase()
			.trim();
	},
};

// Make available in both module and browser global contexts
if (typeof module !== "undefined" && module.exports) {
	module.exports = CONFIG;
} else {
	window.DUEL_CONFIG = CONFIG;
}
