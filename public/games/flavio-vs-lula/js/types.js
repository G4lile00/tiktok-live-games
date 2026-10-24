/**
 * types.js
 * Shared JSDoc type declarations (no runtime code). Editors use these for
 * autocomplete / type checking: `@type {import("./types.js").DuelState}`.
 *
 * @module games/flavio-vs-lula/types
 */

/**
 * One side of the duel, as declared in `config.sides`.
 * @typedef {Object} SideConfig
 * @property {number} id            Index of the side (0 = left, 1 = right).
 * @property {string} name          Full name shown on the card.
 * @property {string} short         Short name shown in the feed / result.
 * @property {string} number        Candidate number typed on the urna (e.g. "22").
 * @property {string} color         CSS color of the side.
 * @property {string} [photo]       Optional avatar image URL.
 * @property {number} [startScore]  Score the side starts every round with.
 * @property {string[]} [aliases]   Chat words that vote for the side.
 */

/**
 * A side while a round is running.
 * @typedef {SideConfig & {
 *   score: number,
 *   supporters: Map<string, {nickname: string, totalContrib: number}>
 * }} SideState
 */

/**
 * Gift event after normalization (see bridge/events.js).
 * @typedef {Object} GiftEvent
 * @property {number} giftId
 * @property {string} giftName
 * @property {number} giftValue     Diamonds of ONE unit of the gift.
 * @property {number} repeatCount   Combo size.
 * @property {{uniqueId: string, nickname: string}} user
 */

/**
 * Chat event as sent by the TikTok bridge.
 * @typedef {Object} ChatEvent
 * @property {string} comment
 * @property {{uniqueId: string, nickname: string}} user
 */

/**
 * Entry of the engine's recent-events list (feed).
 * @typedef {Object} RecentEvent
 * @property {"gift"|"vote"} type
 * @property {string} nickname
 * @property {number} sideIdx
 * @property {string} sideShort
 * @property {string} color
 * @property {number} points        Points added (after the gift multiplier).
 * @property {string} giftName
 * @property {string} giftEmoji
 * @property {number} timestamp
 */

/**
 * Whole state of the duel (what the renderer reads every frame).
 * @typedef {Object} DuelState
 * @property {string} phase                      One of PHASE.
 * @property {number} phaseStartedAt             Date.now() of the phase start.
 * @property {SideState[]} sides
 * @property {SideState|null} winner
 * @property {boolean} isTie
 * @property {number} roundCount
 * @property {number[]} roundsWon                Per side.
 * @property {RecentEvent[]} recentEvents        Newest first.
 */

/**
 * Payload of the engine "scoreAdd" event.
 * @typedef {Object} ScoreAddEvent
 * @property {number} sideIdx
 * @property {number} points
 * @property {SideState} side
 * @property {{uniqueId?: string, nickname?: string}} [user]
 * @property {"gift"|"vote"} type
 */

/**
 * Values that only exist on screen (they ease toward the real state).
 * @typedef {Object} ViewState
 * @property {number[]} shownScore   Score shown per side.
 * @property {number} shownShare     Share of the left side (0–1) shown on the bars.
 * @property {number[]} presents     Gifts received per side in the current round.
 */

export {};
