/**
 * game.js
 * Flavio vs Lula — Canvas renderer + TikTokBridge wiring.
 * Reads state from DuelEngine, draws the tug bar + floating points on Canvas,
 * updates DOM HUD elements (score counters, gift legend, event feed, result).
 *
 * @module games/flavio-vs-lula/game
 */

(() => {
	// ==========================================
	// SETUP
	// ==========================================
	const config = window.DUEL_CONFIG;
	const engine = new DuelEngine(config);
	const L = config.labels;

	const canvas = document.getElementById("duelCanvas");
	const ctx = canvas.getContext("2d");

	// DOM HUD elements
	const phaseBanner = document.getElementById("phaseBanner");
	const gameTitle = document.getElementById("gameTitle");
	const phaseText = document.getElementById("phaseText");
	const phaseTimer = document.getElementById("phaseTimer");
	const sideCardsDiv = document.getElementById("sideCards");
	const eventFeedDiv = document.getElementById("eventFeed");
	const winnerOverlay = document.getElementById("winnerOverlay");
	const winnerBadge = document.getElementById("winnerBadge");
	const winnerName = document.getElementById("winnerName");
	const winnerScore = document.getElementById("winnerScore");
	const winnerSupporters = document.getElementById("winnerSupporters");

	gameTitle.textContent = L.title;

	// ==========================================
	// CANVAS SIZING
	// ==========================================
	function resize() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}
	window.addEventListener("resize", resize);
	resize();

	// ==========================================
	// BRIDGE → ENGINE WIRING
	// ==========================================
	TikTokBridge.on("gift", (data) => engine.handleGift(data));
	TikTokBridge.on("chat", (data) => engine.handleChat(data));

	// ==========================================
	// ANIMATION STATE (purely visual)
	// ==========================================
	/** Score shown on screen (eases toward the real score) */
	const shownScore = config.sides.map(() => 0);
	/** Share of the left side shown on the bar (eases toward the real share) */
	let shownShare = 0.5;
	/** Floating "+N" popups drawn on the canvas */
	const popups = [];

	// ==========================================
	// BUILD SIDE CARDS (counter on top of each side)
	// ==========================================
	function buildSideCards() {
		sideCardsDiv.innerHTML = "";
		config.sides.forEach((side) => {
			const el = document.createElement("div");
			el.className = "side-card";
			el.id = `side-card-${side.id}`;
			el.style.setProperty("--side-color", side.color);

			const avatar = side.photo
				? `<img src="${side.photo}" alt="" />`
				: side.short.charAt(0).toUpperCase();

			const gifts = config
				.getSideGifts(side.id)
				.map((g) => `<span class="gift-chip">${g.emoji}<small>${g.coins}</small></span>`)
				.join("");

			el.innerHTML =
				`<div class="side-head">` +
				`<div class="side-avatar">${avatar}</div>` +
				`<div class="side-name">${side.name}</div>` +
				`</div>` +
				`<div class="side-score" id="score-${side.id}">0</div>` +
				`<div class="side-meta">` +
				`<span class="side-share" id="share-${side.id}">50%</span>` +
				`<span class="side-rounds" id="rounds-${side.id}">${L.rounds}: 0</span>` +
				`</div>` +
				`<div class="side-gifts">${gifts}</div>` +
				(config.chatPoints > 0
					? `<div class="side-vote">${L.voteHint(side.id + 1)}</div>`
					: "");
			sideCardsDiv.appendChild(el);
		});
	}
	buildSideCards();

	// Popup on every score event
	engine.on("scoreAdd", ({ sideIdx, points, side }) => {
		const W = canvas.width;
		const jitter = (Math.random() - 0.5) * 120;
		popups.push({
			x: (sideIdx === 0 ? 245 : W - 245) + jitter,
			y: canvas.height * 0.72 - 30,
			vy: -1.4 - Math.random() * 0.8,
			text: `+${points}`,
			color: side.color,
			life: 1,
		});

		// Bump the counter
		const scoreEl = document.getElementById(`score-${sideIdx}`);
		if (scoreEl) {
			scoreEl.classList.remove("bump");
			void scoreEl.offsetWidth; // restart CSS animation
			scoreEl.classList.add("bump");
		}
	});

	// Rebuild cards when a new round starts (keeps DOM clean)
engine.on("phaseChange", ({ phase }) => {
  if (phase === "playing") {     // <- era "waiting"
    shownScore.fill(0);
    shownShare = 0.5;
    popups.length = 0;
  }
});
	// ==========================================
	// RENDER LOOP
	// ==========================================
	let lastFeedKey = "";

	function frame() {
		const state = engine.tick();
		animate(state);
		drawScene(state);
		updateHUD(state);
		requestAnimationFrame(frame);
	}

	/** Ease the visual values toward the real ones. */
	function animate(state) {
		state.sides.forEach((side, i) => {
			const diff = side.score - shownScore[i];
			shownScore[i] = Math.abs(diff) < 0.5 ? side.score : shownScore[i] + diff * 0.15;
		});
		shownShare += (engine.getShare() - shownShare) * 0.08;
	}

	// ==========================================
	// CANVAS DRAWING
	// ==========================================
	function drawScene(state) {
		const W = canvas.width;
		const H = canvas.height;
		ctx.clearRect(0, 0, W, H);

		const [left, right] = state.sides;
		const barX = W * 0.1;
		const barW = W * 0.8;
		const barH = 44;
		const barY = H * 0.72;
		const splitX = barX + barW * shownShare;

		// Track background
		ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
		ctx.beginPath();
		ctx.roundRect(barX - 8, barY - 8, barW + 16, barH + 16, 16);
		ctx.fill();

		// Side fills (clipped to the rounded bar)
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(barX, barY, barW, barH, 10);
		ctx.clip();
		ctx.fillStyle = left.color;
		ctx.fillRect(barX, barY, splitX - barX, barH);
		ctx.fillStyle = right.color;
		ctx.fillRect(splitX, barY, barX + barW - splitX, barH);

		// Soft highlight
		const hl = ctx.createLinearGradient(0, barY, 0, barY + barH);
		hl.addColorStop(0, "rgba(255,255,255,0.25)");
		hl.addColorStop(1, "rgba(255,255,255,0)");
		ctx.fillStyle = hl;
		ctx.fillRect(barX, barY, barW, barH);
		ctx.restore();

		// Center reference (50%)
		ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
		ctx.lineWidth = 2;
		ctx.setLineDash([6, 6]);
		ctx.beginPath();
		ctx.moveTo(barX + barW / 2, barY - 18);
		ctx.lineTo(barX + barW / 2, barY + barH + 18);
		ctx.stroke();
		ctx.setLineDash([]);

		// Marker at the split point
		ctx.beginPath();
		ctx.arc(splitX, barY + barH / 2, 30, 0, Math.PI * 2);
		ctx.fillStyle = "#fff";
		ctx.fill();
		ctx.lineWidth = 4;
		ctx.strokeStyle = "rgba(0,0,0,0.55)";
		ctx.stroke();
		ctx.fillStyle = "#111";
		ctx.font = "900 22px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("VS", splitX, barY + barH / 2 + 1);

		// Percent labels above each end
		const leftPct = Math.round(shownShare * 100);
		ctx.font = "900 40px sans-serif";
		ctx.textBaseline = "alphabetic";
		ctx.lineWidth = 6;
		ctx.strokeStyle = "rgba(0,0,0,0.65)";
		ctx.textAlign = "left";
		ctx.strokeText(`${leftPct}%`, barX, barY - 20);
		ctx.fillStyle = left.color;
		ctx.fillText(`${leftPct}%`, barX, barY - 20);
		ctx.textAlign = "right";
		ctx.strokeText(`${100 - leftPct}%`, barX + barW, barY - 20);
		ctx.fillStyle = right.color;
		ctx.fillText(`${100 - leftPct}%`, barX + barW, barY - 20);

		// Floating "+N" popups
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		for (let i = popups.length - 1; i >= 0; i--) {
			const p = popups[i];
			p.y += p.vy;
			p.life -= 0.016;
			if (p.life <= 0) {
				popups.splice(i, 1);
				continue;
			}
			ctx.globalAlpha = Math.min(1, p.life * 1.5);
			ctx.font = "900 44px sans-serif";
			ctx.lineWidth = 7;
			ctx.strokeStyle = "rgba(0,0,0,0.75)";
			ctx.strokeText(p.text, p.x, p.y);
			ctx.fillStyle = p.color;
			ctx.fillText(p.text, p.x, p.y);
		}
		ctx.globalAlpha = 1;
	}

	// ==========================================
	// HUD UPDATE
	// ==========================================
	function formatTime(ms) {
		const total = Math.ceil(ms / 1000);
		const m = Math.floor(total / 60);
		const s = total % 60;
		return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
	}

	function updateHUD(state) {
		// Phase text + timer
		phaseText.textContent = L[state.phase] || state.phase;

		const remaining = engine.phaseRemaining();
		if (remaining !== Infinity && remaining > 0 && state.phase !== "cooldown") {
			phaseTimer.textContent = formatTime(remaining);
		} else {
			phaseTimer.textContent = "";
		}

		phaseBanner.classList.toggle("countdown", state.phase === "countdown");

		// Counters, shares, rounds won, leader glow
		const [a, b] = state.sides;
		state.sides.forEach((side, i) => {
			const scoreEl = document.getElementById(`score-${side.id}`);
			const shareEl = document.getElementById(`share-${side.id}`);
			const roundsEl = document.getElementById(`rounds-${side.id}`);
			const cardEl = document.getElementById(`side-card-${side.id}`);

			if (scoreEl) scoreEl.textContent = Math.round(shownScore[i]).toLocaleString("pt-BR");
			if (shareEl) {
				const leftPct = Math.round(shownShare * 100);
				shareEl.textContent = `${i === 0 ? leftPct : 100 - leftPct}%`;
			}
			if (roundsEl) roundsEl.textContent = `${L.rounds}: ${state.roundsWon[side.id]}`;
			if (cardEl) {
				const isLeading = a.score !== b.score && side.score > state.sides[1 - i].score;
				cardEl.classList.toggle("leading", isLeading);
			}
		});

		// Event feed (re-render only when something new arrived)
		const newest = state.recentEvents[0];
		const feedKey = newest ? `${newest.timestamp}-${state.recentEvents.length}` : "";
		if (feedKey !== lastFeedKey) {
			lastFeedKey = feedKey;
			renderFeed(state.recentEvents.slice(0, 8));
		}

		// Result overlay
		if (state.phase === "finished") {
			showResult(state);
		} else {
			winnerOverlay.classList.add("hidden");
		}
	}

	/** Feed uses textContent only, so nicknames can never inject HTML. */
	function renderFeed(events) {
		eventFeedDiv.innerHTML = "";
		events.forEach((evt) => {
			const el = document.createElement("div");
			el.className = "feed-item " + evt.type;
			if (evt.type === "gift" || evt.type === "vote") {
				el.style.borderLeftColor = evt.color;
				el.textContent = `${evt.giftEmoji} ${evt.nickname} → ${evt.sideShort} (+${evt.points} ${L.points})`;
			} else if (evt.type === "chat") {
				el.textContent = `💬 ${evt.nickname}: ${evt.text}`;
			}
			eventFeedDiv.appendChild(el);
		});
	}

	function showResult(state) {
		winnerOverlay.classList.remove("hidden");

		const [a, b] = state.sides;
		winnerScore.textContent = `${a.short} ${a.score.toLocaleString("pt-BR")} × ${b.score.toLocaleString("pt-BR")} ${b.short}`;

		if (state.isTie || !state.winner) {
			winnerBadge.textContent = "🤝";
			winnerBadge.style.background = "#555";
			winnerName.textContent = L.tie;
			winnerName.style.color = "#fff";
			winnerSupporters.textContent = "";
			return;
		}

		const w = state.winner;
		winnerBadge.innerHTML = "";
		if (w.photo) {
			const img = document.createElement("img");
			img.src = w.photo;
			img.alt = "";
			winnerBadge.appendChild(img);
		} else {
			winnerBadge.textContent = w.short.charAt(0).toUpperCase();
		}
		winnerBadge.style.background = w.color;
		winnerName.textContent = `${w.name} ${L.wins}`;
		winnerName.style.color = w.color;

		// Top 3 supporters of the winning side
		const supporters = Array.from(w.supporters.values())
			.sort((x, y) => y.totalContrib - x.totalContrib)
			.slice(0, 3);

		winnerSupporters.textContent = supporters.length
			? `${L.topSupporters} ` +
				supporters.map((s) => `${s.nickname} (${s.totalContrib})`).join(", ")
			: "";
	}

	// ==========================================
	// START
	// ==========================================
	requestAnimationFrame(frame);
	console.log("[FlavioVsLula] Game loaded, waiting for TikTokBridge connection...");
})();
