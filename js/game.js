import { COLORS, LEVELS, tilesFor } from "./levels.js?v=23";
import { createPlatform } from "./platform/index.js";
import { track } from "./stats.js";

const STACK_COUNT = 5;
const STACK_VISIBLE = 6;
const STACK_PAD_TOP = 8;
const STACK_PAD_BOT = 10;
const UNDO_MAX = 5;
const SHUFFLE_MAX = 3;
const WAND_MAX = 2;
const REWARD = 50;
const HINT = "Выложи плитки в канавки. Три одинаковых сверху — в рамку";

const platform = await createPlatform();

const $ = (id) => document.getElementById(id);

const ui = {
    screens: {
        menu: $("screen-menu"),
        howto: $("screen-howto"),
        gallery: $("screen-gallery"),
        play: $("screen-play")
    },
    mosaic: $("mosaic"),
    frame: $("frame"),
    stacks: $("stacks"),
    hand: $("hand"),
    deck: $("deck"),
    deckCount: $("deck-count"),
    coins: $("coins"),
    menuCoins: $("menu-coins"),
    menuProgress: $("menu-progress"),
    playBtn: $("play-btn"),
    levelName: $("level-name"),
    hint: $("hint"),
    overlay: $("overlay"),
    winTitle: $("win-title"),
    winCopy: $("win-copy"),
    reward: $("reward"),
    claim: $("claim"),
    retry: $("retry"),
    winMenu: $("win-menu"),
    menuBtn: $("menu-btn"),
    mute: $("mute"),
    shuffle: $("shuffle"),
    undo: $("undo"),
    extra: $("extra"),
    extraUses: $("extra-uses"),
    wand: $("wand"),
    shuffleUses: $("shuffle-uses"),
    undoUses: $("undo-uses"),
    wandUses: $("wand-uses"),
    toast: $("toast"),
    fx: $("fx"),
    galleryGrid: $("gallery-grid"),
    gallerySheet: $("gallery-sheet"),
    galleryPage1: $("gallery-page-1"),
    galleryPage2: $("gallery-page-2")
};

const COMING_COUNT = 18;
let galleryPage = 1;
let stackFit = { shown: STACK_VISIBLE, peek: 18 };

function readTilePx() {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:var(--tile);height:var(--tile)";
    document.getElementById("app").appendChild(probe);
    const tile = probe.getBoundingClientRect().width || 40;
    probe.remove();
    return tile;
}

function measureStackFit() {
    void ui.screens.play.offsetHeight;
    const h = ui.stacks.getBoundingClientRect().height || parseFloat(getComputedStyle(ui.stacks).height) || 180;
    if (h < 40) return stackFit;
    const tile = readTilePx();
    const inner = Math.max(tile, h - STACK_PAD_TOP - STACK_PAD_BOT);
    const peek = (inner - tile) / (STACK_VISIBLE - 1);
    stackFit = { shown: STACK_VISIBLE, peek };
    return stackFit;
}

let tileSeq = 1;
let busy = false;
let paused = false;
let toastTimer = 0;
let audioCtx = null;
let screen = "menu";

function defaultSave() {
    return {
        coins: 0,
        mute: false,
        unlocked: 0,
        completed: [],
        seenHowto: false,
        dev: false
    };
}

const save = { ...defaultSave(), ...((await platform.load()) || {}) };

const state = {
    levelIndex: 0,
    mosaic: [],
    stacks: [],
    deck: [],
    hand: null,
    shuffles: SHUFFLE_MAX,
    undos: UNDO_MAX,
    extraUsed: false,
    extraAdUsed: false,
    wands: WAND_MAX,
    history: [],
    won: false,
    claimed: false
};

function persist() {
    Promise.resolve(platform.save(save)).catch(() => {});
}

function isDev() {
    return Boolean(save.dev);
}

function isUnlocked(index) {
    return isDev() || index <= save.unlocked;
}

function setDev(on, { silent = false } = {}) {
    save.dev = on;
    persist();
    renderMenu();
    if (screen === "gallery") renderGallery();
    if (!silent) {
        toast(on ? "Режим мастера: все картины открыты" : "Режим мастера выключен");
    }
}

function nextPlayIndex() {
    if (save.completed.length >= LEVELS.length) return 0;
    for (let i = 0; i <= save.unlocked && i < LEVELS.length; i++) {
        if (!save.completed.includes(LEVELS[i].id)) return i;
    }
    return Math.min(save.unlocked, LEVELS.length - 1);
}

function showScreen(name) {
    screen = name;
    Object.entries(ui.screens).forEach(([key, el]) => {
        el.classList.toggle("active", key === name);
    });
    if (name === "menu") renderMenu();
    if (name === "gallery") renderGallery();
}

function renderMenu() {
    const done = save.completed.length;
    ui.menuProgress.textContent = isDev()
        ? `Мастер · ${done} / ${LEVELS.length}`
        : `Картины ${done} / ${LEVELS.length}`;
    ui.menuCoins.textContent = String(save.coins);
    const nxt = nextPlayIndex();
    const allDone = done >= LEVELS.length;
    ui.playBtn.textContent = allDone
        ? "Играть снова"
        : (done === 0 ? "Играть" : `Продолжить · ${LEVELS[nxt].title}`);
    $("dev-panel").hidden = !isDev();
    $("dev-mark").classList.toggle("dev-on", isDev());
    $("dev-platform").textContent = `Площадка: ${platform.id}`;
    const chip = $("platform-chip");
    const forced = new URLSearchParams(location.search).has("platform");
    chip.hidden = !(isDev() || forced);
    chip.textContent = `Площадка: ${platform.id}`;
}

function miniMosaic(level, filled) {
    const mosaic = document.createElement("div");
    mosaic.className = "gallery-mosaic";
    mosaic.style.setProperty("--cols", String(level.cols));
    mosaic.style.setProperty("--rows", String(level.rows));
    mosaic.style.gridTemplateColumns = `repeat(${level.cols}, 1fr)`;
    mosaic.style.gridTemplateRows = `repeat(${level.rows}, 1fr)`;
    level.pieces.forEach((p) => {
        const pal = COLORS[p.color];
        const cell = document.createElement("div");
        cell.className = `gallery-cell${filled ? " filled" : ""}`;
        cell.style.gridColumn = `${p.x + 1} / span ${p.w}`;
        cell.style.gridRow = `${p.y + 1} / span ${p.h}`;
        cell.style.setProperty("--c", pal.c);
        cell.style.setProperty("--d", pal.d);
        mosaic.appendChild(cell);
    });
    return mosaic;
}

function comingMosaic() {
    const mosaic = document.createElement("div");
    mosaic.className = "gallery-mosaic coming";
    mosaic.style.setProperty("--cols", "5");
    mosaic.style.setProperty("--rows", "4");
    mosaic.style.gridTemplateColumns = "repeat(5, 1fr)";
    mosaic.style.gridTemplateRows = "repeat(4, 1fr)";
    for (let i = 0; i < 20; i++) {
        const cell = document.createElement("div");
        cell.className = "gallery-cell coming-cell";
        mosaic.appendChild(cell);
    }
    return mosaic;
}

function renderGallery() {
    ui.galleryGrid.replaceChildren();
    const sheet = $("gallery-sheet");
    const onFirst = galleryPage === 1;
    ui.galleryPage1?.classList.toggle("on", onFirst);
    ui.galleryPage2?.classList.toggle("on", !onFirst);
    if (sheet) {
        sheet.textContent = onFirst ? "Мастерская 1" : "В разработке";
    }
    if (!onFirst) {
        for (let i = 0; i < COMING_COUNT; i++) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "gallery-card locked coming";
            btn.disabled = true;
            const frame = document.createElement("div");
            frame.className = "gallery-frame";
            frame.appendChild(comingMosaic());
            const lock = document.createElement("span");
            lock.className = "gallery-lock";
            lock.setAttribute("aria-hidden", "true");
            lock.textContent = "🔒";
            frame.appendChild(lock);
            const title = document.createElement("div");
            title.className = "gallery-title";
            title.textContent = "Скоро";
            btn.append(frame, title);
            ui.galleryGrid.appendChild(btn);
        }
        return;
    }
    LEVELS.forEach((level, index) => {
        const done = save.completed.includes(level.id);
        const open = isUnlocked(index);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `gallery-card${open ? "" : " locked"}${done ? " done" : ""}`;
        btn.disabled = !open;
        const frame = document.createElement("div");
        frame.className = "gallery-frame";
        frame.appendChild(miniMosaic(level, done || isDev()));
        if (!open) {
            const lock = document.createElement("span");
            lock.className = "gallery-lock";
            lock.setAttribute("aria-hidden", "true");
            lock.textContent = "🔒";
            frame.appendChild(lock);
        }
        const title = document.createElement("div");
        title.className = "gallery-title";
        title.textContent = open ? `${index + 1}. ${level.title}` : "Закрыто";
        btn.append(frame, title);
        if (open) {
            btn.addEventListener("click", () => enterPlay(index));
        }
        ui.galleryGrid.appendChild(btn);
    });
}

function enterPlay(index, { fromHowto = false } = {}) {
    if (!fromHowto && !save.seenHowto) {
        showScreen("howto");
        return;
    }
    if (fromHowto) {
        save.seenHowto = true;
        persist();
    }
    showScreen("play");
    startLevel(index);
}

function shuffle(list, rand = Math.random) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function makeTile(color) {
    return { id: tileSeq++, color };
}

function cloneRun() {
    return JSON.parse(JSON.stringify({
        mosaic: state.mosaic,
        stacks: state.stacks,
        deck: state.deck,
        hand: state.hand,
        shuffles: state.shuffles,
        extraUsed: state.extraUsed,
        extraAdUsed: state.extraAdUsed
    }));
}

function restoreRun(snap) {
    Object.assign(state, snap);
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function beep(freq, dur = 0.08, type = "sine", gain = 0.04) {
    if (save.mute) return;
    try {
        audioCtx = audioCtx || new AudioContext();
        const t0 = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(gain, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start(t0);
        osc.stop(t0 + dur);
    } catch {
        /* ignore */
    }
}

function toast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 1600);
}

function topMatch(pile) {
    if (!pile || pile.length < 3) return false;
    const a = pile[pile.length - 1];
    const b = pile[pile.length - 2];
    const c = pile[pile.length - 3];
    return a.color === b.color && b.color === c.color;
}

function startLevel(index) {
    const safe = Math.max(0, Math.min(index, LEVELS.length - 1));
    const level = LEVELS[safe];
    state.levelIndex = safe;
    state.mosaic = level.pieces.map((p) => ({
        color: p.color,
        w: p.w,
        h: p.h,
        x: p.x,
        y: p.y,
        poly: p.poly,
        filled: false
    }));
    state.hand = null;
    state.shuffles = SHUFFLE_MAX;
    state.undos = UNDO_MAX;
    state.wands = WAND_MAX;
    state.extraUsed = false;
    state.extraAdUsed = false;
    state.history = [];
    state.won = false;
    state.claimed = false;
    ui.overlay.classList.remove("show");
    ui.frame.classList.remove("complete");

    const pile = shuffle(tilesFor(level).map(makeTile));
    state.stacks = Array.from({ length: STACK_COUNT }, () => []);
    for (let s = 0; s < STACK_COUNT; s++) {
        const count = s + 1;
        for (let n = 0; n < count; n++) {
            const tile = pile.shift();
            if (tile) state.stacks[s].push(tile);
        }
    }
    state.deck = pile;
    render();
}

function pushHistory() {
    state.history.push(cloneRun());
    if (state.history.length > 20) state.history.shift();
}

function tileNode(tile, extraClass = "") {
    const pal = COLORS[tile.color];
    const el = document.createElement("div");
    el.className = `tile ${extraClass}`.trim();
    el.style.setProperty("--c", pal.c);
    el.style.setProperty("--d", pal.d);
    el.dataset.id = String(tile.id);
    el.dataset.color = tile.color;
    return el;
}

function renderMosaic() {
    const level = LEVELS[state.levelIndex];
    ui.mosaic.style.setProperty("--cols", String(level.cols));
    ui.mosaic.style.setProperty("--rows", String(level.rows));
    ui.mosaic.style.gridTemplateColumns = `repeat(${level.cols}, 1fr)`;
    ui.mosaic.style.gridTemplateRows = `repeat(${level.rows}, 1fr)`;
    ui.mosaic.style.backgroundImage = "none";
    ui.mosaic.replaceChildren();
    state.mosaic.forEach((cell, i) => {
        const pal = COLORS[cell.color];
        const el = document.createElement("div");
        el.className = `cell${cell.filled ? " filled" : ""}`;
        el.style.gridColumn = `${cell.x + 1} / span ${cell.w}`;
        el.style.gridRow = `${cell.y + 1} / span ${cell.h}`;
        el.style.setProperty("--c", pal.c);
        el.style.setProperty("--d", pal.d);
        el.dataset.i = String(i);
        ui.mosaic.appendChild(el);
    });
}

function renderStacks() {
    const { shown, peek } = measureStackFit();
    ui.stacks.replaceChildren();
    const holding = Boolean(state.hand);
    state.stacks.forEach((pile, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `stack${holding ? " can-drop" : ""}`;
        btn.dataset.i = String(i);
        btn.setAttribute(
            "aria-label",
            holding
                ? (pile.length ? "Выложить в канавку" : "Выложить в пустую канавку")
                : (pile.length ? "Взять верхнюю плитку" : "Пустая канавка")
        );
        if (!pile.length) {
            const empty = document.createElement("div");
            empty.className = "stack-empty";
            btn.appendChild(empty);
        } else {
            const hidden = pile.length - shown;
            if (hidden > 0) {
                const more = document.createElement("span");
                more.className = "stack-count";
                more.setAttribute("aria-hidden", "true");
                more.textContent = `+${hidden}`;
                btn.appendChild(more);
            }
            pile.slice(-shown).forEach((tile, vis) => {
                const el = tileNode(tile);
                el.style.setProperty("--stack-y", `${STACK_PAD_TOP + vis * peek}px`);
                el.style.zIndex = String(vis + 1);
                btn.appendChild(el);
            });
        }
        ui.stacks.appendChild(btn);
    });
}

function renderHand() {
    ui.hand.replaceChildren();
    ui.hand.classList.toggle("has-tile", Boolean(state.hand));
    if (state.hand) ui.hand.appendChild(tileNode(state.hand));
}

function render() {
    const level = LEVELS[state.levelIndex];
    ui.levelName.textContent = `Картина ${state.levelIndex + 1} · ${level.title}`;
    ui.coins.textContent = String(save.coins);
    ui.hint.textContent = state.hand
        ? "Теперь выложи её в канавку — в том числе в пустую"
        : HINT;
    ui.deck.classList.toggle("empty", state.deck.length === 0);
    ui.deckCount.textContent = String(state.deck.length);
    ui.deck.disabled = busy || state.won || state.deck.length === 0 || Boolean(state.hand);
    ui.shuffleUses.textContent = state.shuffles > 0 ? String(state.shuffles) : "▶";
    ui.undoUses.textContent = state.undos > 0 ? String(state.undos) : "▶";
    ui.wandUses.textContent = state.wands > 0 ? String(state.wands) : "▶";
    ui.shuffle.classList.toggle("booster-ad", state.shuffles <= 0);
    ui.undo.classList.toggle("booster-ad", state.undos <= 0);
    ui.wand.classList.toggle("booster-ad", state.wands <= 0);
    ui.extra.classList.toggle("booster-ad", state.extraUsed && !state.extraAdUsed);
    ui.extraUses.hidden = state.extraUsed && state.extraAdUsed;
    ui.extraUses.textContent = state.extraUsed
        ? (state.extraAdUsed ? "" : "▶")
        : "1";
    ui.shuffle.disabled = busy || state.won || paused;
    ui.undo.disabled = busy || state.won || paused || (state.undos <= 0 && !state.history.length);
    ui.wand.disabled = busy || state.won || paused;
    ui.extra.disabled = busy || state.won || paused || (state.extraUsed && state.extraAdUsed);
    ui.mute.textContent = save.mute ? "🔇" : "🔊";
    ui.mute.setAttribute("aria-label", save.mute ? "Включить звук" : "Выключить звук");
    renderMosaic();
    renderStacks();
    renderHand();
}

function shake(el) {
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
    beep(140, 0.1, "square", 0.03);
}

function flyClone(fromEl, toRect, color) {
    const from = fromEl.getBoundingClientRect();
    const pal = COLORS[color];
    const clone = document.createElement("div");
    clone.className = "tile fx-tile";
    clone.style.setProperty("--c", pal.c);
    clone.style.setProperty("--d", pal.d);
    clone.style.width = `${from.width}px`;
    clone.style.height = `${from.height}px`;
    clone.style.left = `${from.left}px`;
    clone.style.top = `${from.top}px`;
    ui.fx.appendChild(clone);
    const dx = toRect.left + toRect.width / 2 - (from.left + from.width / 2);
    const dy = toRect.top + toRect.height / 2 - (from.top + from.height / 2);
    const scale = Math.max(0.35, toRect.width / from.width);
    requestAnimationFrame(() => {
        clone.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
        clone.style.opacity = "0.35";
    });
    return wait(420).then(() => clone.remove());
}

async function resolveMerges() {
    for (let s = 0; s < state.stacks.length; s++) {
        while (topMatch(state.stacks[s])) {
            const pile = state.stacks[s];
            const color = pile[pile.length - 1].color;
            const target = state.mosaic.findIndex((c) => c.color === color && !c.filled);
            if (target < 0) break;

            const stackEl = ui.stacks.querySelector(`[data-i="${s}"]`);
            const tileEls = [...(stackEl?.querySelectorAll(".tile") || [])].slice(-3);
            const cellEl = ui.mosaic.querySelector(`[data-i="${target}"]`);
            const dest = cellEl.getBoundingClientRect();
            tileEls.forEach((el) => {
                el.style.visibility = "hidden";
            });
            beep(420, 0.07, "triangle", 0.045);
            await Promise.all(tileEls.map((el) => flyClone(el, dest, color)));

            pile.splice(-3, 3);
            state.mosaic[target].filled = true;
            render();
            ui.mosaic.querySelector(`[data-i="${target}"]`)?.classList.add("pop");
            beep(620, 0.1, "sine", 0.05);
            try {
                navigator.vibrate?.(12);
            } catch {
                /* ignore */
            }
            s = -1;
            break;
        }
    }
}

function finishLevel() {
    const id = LEVELS[state.levelIndex].id;
    const first = !save.completed.includes(id);
    if (first) save.completed.push(id);
    save.unlocked = Math.max(save.unlocked, Math.min(state.levelIndex + 1, LEVELS.length - 1));
    persist();
    track("complete", {
        platform: platform.id,
        level: id,
        first,
        total: save.completed.length
    });
}

function checkWin() {
    if (!state.mosaic.every((c) => c.filled)) return;
    state.won = true;
    finishLevel();
    ui.frame.classList.add("complete");
    const last = state.levelIndex >= LEVELS.length - 1;
    ui.winTitle.textContent = last ? "Мастерская полна!" : "Картина готова!";
    ui.winCopy.textContent = last
        ? "Все 18 картин собраны. Их можно снова открыть в галерее."
        : "Мозаика собрана и повешена в галерею.";
    ui.reward.textContent = `+${REWARD} монет`;
    ui.claim.textContent = "Забрать награду";
    render();
    beep(523, 0.12);
    setTimeout(() => beep(659, 0.12), 90);
    setTimeout(() => beep(784, 0.18), 180);
    setTimeout(() => ui.overlay.classList.add("show"), 420);
}

async function placeOnStack(index) {
    if (paused || busy || state.won || !state.hand) return;
    busy = true;
    pushHistory();
    state.stacks[index].push(state.hand);
    state.hand = null;
    render();
    beep(320, 0.05, "sine", 0.03);
    await resolveMerges();
    checkWin();
    busy = false;
    render();
}

function pickFromStack(index) {
    if (paused || busy || state.won || state.hand) return;
    const pile = state.stacks[index];
    if (!pile.length) {
        toast("Сначала возьми плитку из колоды");
        return;
    }
    pushHistory();
    state.hand = pile.pop();
    beep(280, 0.05, "sine", 0.03);
    render();
}

function onStackClick(index) {
    if (paused || busy || state.won) return;
    if (state.hand) placeOnStack(index);
    else pickFromStack(index);
}

function drawDeck() {
    if (paused || busy || state.won || !state.deck.length) return;
    if (state.hand) {
        shake(ui.hand);
        toast("Сначала выложи плитку в канавку");
        return;
    }
    pushHistory();
    state.hand = state.deck.shift();
    beep(300, 0.05, "sine", 0.03);
    render();
}

async function runAd(kind) {
    paused = true;
    audioCtx?.suspend();
    render();
    try {
        if (kind === "rewarded") return await platform.showRewarded();
        return await platform.showInterstitial();
    } catch {
        return false;
    } finally {
        paused = false;
        if (!document.hidden) audioCtx?.resume();
        render();
    }
}

function doUndo() {
    if (paused || busy || state.won) return;
    if (state.undos <= 0) {
        refillWithAd("undos", "Ещё одна отмена");
        return;
    }
    if (!state.history.length) return;
    restoreRun(state.history.pop());
    state.undos -= 1;
    beep(240, 0.08);
    render();
}

function doShuffle() {
    if (paused || busy || state.won) return;
    if (state.shuffles <= 0) {
        refillWithAd("shuffles", "Ещё одно перемешивание");
        return;
    }
    pushHistory();
    const held = state.hand ? [state.hand] : [];
    state.hand = null;
    const sizes = state.stacks.map((s) => s.length);
    const pool = shuffle(state.stacks.flat().concat(state.deck, held));
    state.stacks = sizes.map((n) => pool.splice(0, n));
    state.deck = pool;
    state.shuffles -= 1;
    beep(280, 0.06);
    beep(340, 0.08);
    render();
    toast("Плитки перемешаны");
}

function pickWandColor() {
    const counts = {};
    for (const pile of state.stacks) {
        for (const tile of pile) {
            counts[tile.color] = (counts[tile.color] || 0) + 1;
        }
    }
    const ready = Object.keys(counts).filter(
        (color) =>
            counts[color] >= 3 && state.mosaic.some((cell) => cell.color === color && !cell.filled)
    );
    ready.sort((a, b) => counts[b] - counts[a]);
    return ready[0] || null;
}

function takeWandTiles(color) {
    const taken = [];
    for (let s = state.stacks.length - 1; s >= 0 && taken.length < 3; s--) {
        const pile = state.stacks[s];
        for (let i = pile.length - 1; i >= 0 && taken.length < 3; i--) {
            if (pile[i].color === color) taken.push({ s, i, tile: pile[i] });
        }
    }
    const byStack = new Map();
    for (const item of taken) {
        if (!byStack.has(item.s)) byStack.set(item.s, []);
        byStack.get(item.s).push(item.i);
    }
    const removed = [];
    for (const [s, indexes] of byStack) {
        indexes.sort((a, b) => b - a);
        for (const i of indexes) {
            removed.push({ s, tile: state.stacks[s].splice(i, 1)[0] });
        }
    }
    return removed;
}

async function doWand() {
    if (paused || busy || state.won) return;
    if (state.wands <= 0) {
        refillWithAd("wands", "Ещё одна палочка");
        return;
    }
    const color = pickWandColor();
    if (!color) {
        toast("В канавках нет трёх одинаковых");
        shake(ui.wand);
        return;
    }
    const picked = [];
    for (let s = state.stacks.length - 1; s >= 0 && picked.length < 3; s--) {
        const pile = state.stacks[s];
        for (let i = pile.length - 1; i >= 0 && picked.length < 3; i--) {
            if (pile[i].color === color) picked.push({ s, i });
        }
    }
    const tileEls = picked
        .map(({ s, i }) => {
            const pile = state.stacks[s];
            const dom = i - Math.max(0, pile.length - stackFit.shown);
            return ui.stacks.querySelector(`[data-i="${s}"]`)?.querySelectorAll(".tile")[dom];
        })
        .filter(Boolean);
    const target = state.mosaic.findIndex((c) => c.color === color && !c.filled);
    const cellEl = ui.mosaic.querySelector(`[data-i="${target}"]`);
    if (target < 0 || !cellEl || tileEls.length < 3) {
        toast("В канавках нет трёх одинаковых");
        return;
    }
    busy = true;
    pushHistory();
    state.wands -= 1;
    const dest = cellEl.getBoundingClientRect();
    tileEls.forEach((el) => {
        el.style.visibility = "hidden";
    });
    beep(480, 0.08, "triangle", 0.05);
    await Promise.all(tileEls.map((el) => flyClone(el, dest, color)));
    takeWandTiles(color);
    state.mosaic[target].filled = true;
    render();
    ui.mosaic.querySelector(`[data-i="${target}"]`)?.classList.add("pop");
    beep(620, 0.1, "sine", 0.05);
    await resolveMerges();
    checkWin();
    busy = false;
    render();
}

function doExtra() {
    if (paused || busy || state.won) return;
    if (state.extraUsed) {
        if (state.extraAdUsed) return;
        refillWithAd("extra", "Ещё одна канавка");
        return;
    }
    pushHistory();
    state.extraUsed = true;
    state.stacks.push([]);
    beep(500, 0.08);
    render();
    toast("Ещё одна канавка");
}

async function refillWithAd(kind, okText) {
    if (busy) return;
    busy = true;
    render();
    const ok = await runAd("rewarded");
    busy = false;
    if (!ok) {
        toast("Реклама не показалась — можно играть и так");
        render();
        return;
    }
    if (kind === "shuffles") state.shuffles += 1;
    if (kind === "undos") state.undos += 1;
    if (kind === "wands") state.wands += 1;
    if (kind === "extra") {
        pushHistory();
        state.extraAdUsed = true;
        state.stacks.push([]);
    }
    beep(500, 0.08);
    render();
    toast(okText);
}

async function claimReward() {
    if (!state.claimed) {
        state.claimed = true;
        save.coins += REWARD;
        persist();
        ui.coins.textContent = String(save.coins);
        const last = state.levelIndex >= LEVELS.length - 1;
        ui.claim.textContent = last ? "В галерею" : "Следующая картина";
        beep(700, 0.12);
        return;
    }
    if (state.levelIndex >= LEVELS.length - 1) {
        showScreen("gallery");
        return;
    }
    ui.claim.disabled = true;
    if (save.completed.length > 1) {
        await runAd("interstitial");
    }
    ui.claim.disabled = false;
    startLevel(state.levelIndex + 1);
}

ui.stacks.addEventListener("click", (e) => {
    const stack = e.target.closest(".stack");
    if (stack) onStackClick(Number(stack.dataset.i));
});

ui.deck.addEventListener("click", drawDeck);
ui.hand.addEventListener("click", () => {
    if (!state.hand) drawDeck();
    else toast("Нажми на канавку, чтобы выложить");
});
ui.undo.addEventListener("click", doUndo);
ui.shuffle.addEventListener("click", doShuffle);
ui.wand.addEventListener("click", doWand);
ui.extra.addEventListener("click", doExtra);
ui.claim.addEventListener("click", claimReward);
ui.retry.addEventListener("click", () => startLevel(state.levelIndex));
ui.winMenu.addEventListener("click", () => {
    if (state.won && !state.claimed) {
        state.claimed = true;
        save.coins += REWARD;
        persist();
    }
    showScreen("menu");
});
ui.menuBtn.addEventListener("click", () => {
    if (state.won && !state.claimed) {
        state.claimed = true;
        save.coins += REWARD;
        persist();
    }
    showScreen("menu");
});
ui.mute.addEventListener("click", () => {
    save.mute = !save.mute;
    persist();
    render();
});

ui.playBtn.addEventListener("click", () => enterPlay(nextPlayIndex()));
$("howto-btn").addEventListener("click", () => showScreen("howto"));
$("howto-back").addEventListener("click", () => showScreen("menu"));
$("gallery-btn").addEventListener("click", () => {
    galleryPage = 1;
    showScreen("gallery");
});
$("gallery-back").addEventListener("click", () => showScreen("menu"));
$("gallery-page-1").addEventListener("click", () => {
    galleryPage = 1;
    renderGallery();
});
$("gallery-page-2").addEventListener("click", () => {
    galleryPage = 2;
    renderGallery();
});
$("howto-play").addEventListener("click", () => enterPlay(nextPlayIndex(), { fromHowto: true }));

let markTaps = 0;
let markTimer = 0;
$("dev-mark").addEventListener("click", () => {
    markTaps += 1;
    clearTimeout(markTimer);
    if (markTaps >= 5) {
        markTaps = 0;
        setDev(true);
        return;
    }
    markTimer = setTimeout(() => {
        markTaps = 0;
    }, 1400);
});
$("dev-reset").addEventListener("click", () => {
    save.unlocked = 0;
    save.completed = [];
    persist();
    renderMenu();
    toast("Прогресс сброшен, картины в мастере всё ещё открыты");
});
$("dev-off").addEventListener("click", () => setDev(false));

if (new URLSearchParams(location.search).has("dev") || location.hash === "#dev") {
    setDev(true, { silent: true });
}

platform.onPause(() => {
    paused = true;
    audioCtx?.suspend();
});
platform.onResume(() => {
    paused = false;
    audioCtx?.resume();
});

document.addEventListener("contextmenu", (e) => e.preventDefault());

showScreen("menu");
document.documentElement.lang = (platform.locale() || "ru").slice(0, 2);
platform.ready();
track("launch", { platform: platform.id, total: save.completed.length });

if (new URLSearchParams(location.search).has("shot")) {
    Object.assign(save, {
        seenHowto: true,
        dev: false,
        mute: false,
        coins: 240,
        unlocked: 8,
        completed: LEVELS.slice(0, 6).map((level) => level.id)
    });
    const shotPlay = (index, fill) => {
        showScreen("play");
        startLevel(index);
        const n = Math.max(1, Math.floor(state.mosaic.length * fill));
        state.mosaic.forEach((cell, i) => {
            cell.filled = i < n;
        });
        if (state.deck.length) state.hand = state.deck.pop();
        render();
    };
    const shotWin = (index) => {
        showScreen("play");
        startLevel(index);
        state.mosaic.forEach((cell) => {
            cell.filled = true;
        });
        state.won = true;
        state.hand = null;
        ui.frame.classList.add("complete");
        ui.winTitle.textContent = "Картина готова!";
        ui.winCopy.textContent = "Мозаика собрана и повешена в галерею.";
        ui.reward.textContent = `+${REWARD} монет`;
        ui.claim.textContent = "Забрать награду";
        render();
        ui.overlay.classList.add("show");
    };
    window.__mosaeliaShot = {
        menu() {
            showScreen("menu");
        },
        howto() {
            showScreen("howto");
        },
        gallery() {
            galleryPage = 1;
            showScreen("gallery");
        },
        gallery2() {
            galleryPage = 2;
            showScreen("gallery");
        },
        play() {
            shotPlay(0, 0.48);
        },
        playfull() {
            shotPlay(6, 0.42);
            const color = state.stacks[4]?.[0]?.color || "leaf";
            while (state.stacks[4].length < 16) {
                state.stacks[4].push(makeTile(color));
            }
            render();
        },
        win() {
            shotWin(1);
        }
    };
    const shotMode = new URLSearchParams(location.search).get("shot");
    if (shotMode && window.__mosaeliaShot[shotMode]) {
        window.__mosaeliaShot[shotMode]();
    }
}
