import { COLORS, LEVELS as CAMPAIGN, tilesFor } from "./levels.js?v=53";
import { FRAMES } from "./frames.js?v=53";
import { OCT_LEVELS } from "./october.js?v=53";
import { HW_LEVELS } from "./halloween.js?v=53";
import { daysInMonth, isoDay, mondayIndex, MONTHS_RU, moscowParts, octIndexForIso, octMonthParts, todayIso } from "./calendar.js?v=53";
import { createPlatform } from "./platform/index.js";
import { fetchRanks, guestId, track } from "./stats.js";

const LEVELS = CAMPAIGN.concat(HW_LEVELS);

const STACK_COUNT = 5;
const STACK_VISIBLE = 6;
const STACK_PAD_TOP = 8;
const STACK_PAD_BOT = 10;
const UNDO_MAX = 5;
const SHUFFLE_MAX = 3;
const WAND_MAX = 2;
const REWARD = 50;
const REPLAY_REWARD = 5;
const CLEAN_BONUS = 25;
const DAILY_BONUS = 20;
const RANK_PLACE_COIN = 10;
const RANK_PLACE_CAP = 50;
const AD_HELP_MAX = 3;
const NEWS_ID = "2026-10-01";
const HINT = "Выложи плитки в канавки. Три одинаковых сверху — в рамку";

const platform = await createPlatform();

const $ = (id) => document.getElementById(id);

const ui = {
    screens: {
        menu: $("screen-menu"),
        howto: $("screen-howto"),
        gallery: $("screen-gallery"),
        bonus: $("screen-bonus"),
        shop: $("screen-shop"),
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
    moves: $("moves"),
    winMoves: $("win-moves"),
    winStars: $("win-stars"),
    winShare: $("win-share"),
    winClean: $("win-clean"),
    winRankList: $("win-rank-list"),
    rankCaption: $("rank-caption"),
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
    galleryPage2: $("gallery-page-2"),
    galleryPage3: $("gallery-page-3"),
    galleryPageHw: $("gallery-page-hw"),
    galleryPageSoon: $("gallery-page-soon")
};

let galleryPage = 1;
let pendingDaily = false;
let pendingCalIso = "";
let overlayBack = "menu";
let browsingRanks = false;
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

function syncViewport() {
    const h = Math.round(window.visualViewport?.height || window.innerHeight || 0);
    if (h > 40) document.documentElement.style.setProperty("--app-h", `${h}px`);
    if (screen === "play") {
        fitPlayMosaic();
        if (ui.stacks?.childElementCount) renderStacks();
    }
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
        dev: false,
        shuffles: SHUFFLE_MAX,
        undos: UNDO_MAX,
        wands: WAND_MAX,
        extraUsed: false,
        bestMoves: {},
        bestStars: {},
        cleanRuns: {},
        framesOwned: ["oak"],
        frame: "oak",
        dailyDate: "",
        dailyBest: 0,
        dailyLevel: "",
        dailyStars: 0,
        dailyClean: false,
        calDays: {},
        calAds: {},
        adHelpDate: "",
        adHelps: 0,
        seenNews: ""
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
    claimed: false,
    moves: 0,
    usedShuffle: false,
    usedWand: false,
    dailyMode: false,
    calIso: "",
    payout: REWARD
};

function persist() {
    Promise.resolve(platform.save(save)).catch(() => {});
}

function readCount(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function syncBoosters() {
    save.shuffles = state.shuffles;
    save.undos = state.undos;
    save.wands = state.wands;
    save.extraUsed = state.extraUsed;
    persist();
}

function applyBoostersFromSave() {
    state.shuffles = readCount(save.shuffles, SHUFFLE_MAX);
    state.undos = readCount(save.undos, UNDO_MAX);
    state.wands = readCount(save.wands, WAND_MAX);
    state.extraUsed = Boolean(save.extraUsed);
}

function isDev() {
    return Boolean(save.dev);
}

function halloweenLive() {
    if (isDev()) return true;
    const q = new URLSearchParams(location.search);
    if (q.has("hw") || q.has("shot")) return true;
    return todayIso() >= "2026-10-15";
}

function syncHalloweenUi() {
    const live = halloweenLive();
    const banner = $("hw-banner");
    const tab = $("gallery-page-hw");
    if (banner) banner.hidden = !live;
    if (tab) tab.hidden = !live;
    if (!live && galleryPage === 4) galleryPage = 1;
}

function fitPlayMosaic() {
    const wrap = ui.frame?.parentElement;
    if (!wrap || !ui.frame || !ui.mosaic || screen !== "play") return;
    const level = currentLevel();
    const cols = Math.max(1, level?.cols || 5);
    const rows = Math.max(1, level?.rows || 4);
    ui.mosaic.style.width = "";
    ui.mosaic.style.height = "";
    const wrapBox = wrap.getBoundingClientRect();
    if (wrapBox.width < 20 || wrapBox.height < 20) return;
    const frameCs = getComputedStyle(ui.frame);
    const inner = ui.frame.querySelector(".frame-inner");
    const innerCs = inner ? getComputedStyle(inner) : null;
    const chromeX = (parseFloat(frameCs.paddingLeft) || 0)
        + (parseFloat(frameCs.paddingRight) || 0)
        + (innerCs ? (parseFloat(innerCs.paddingLeft) || 0) + (parseFloat(innerCs.paddingRight) || 0) : 0);
    const chromeY = (parseFloat(frameCs.paddingTop) || 0)
        + (parseFloat(frameCs.paddingBottom) || 0)
        + (innerCs ? (parseFloat(innerCs.paddingTop) || 0) + (parseFloat(innerCs.paddingBottom) || 0) : 0);
    const maxW = Math.max(48, Math.min(wrapBox.width, 340) - chromeX);
    const maxH = Math.max(48, wrapBox.height - chromeY);
    const cell = Math.min(maxW / cols, maxH / rows);
    const w = Math.floor(cell * cols);
    const h = Math.floor(cell * rows);
    ui.mosaic.style.width = `${w}px`;
    ui.mosaic.style.height = `${h}px`;
    ui.mosaic.style.maxWidth = "none";
    ui.mosaic.style.maxHeight = "none";
    ui.mosaic.style.aspectRatio = "auto";
}

function isUnlocked(index) {
    const level = LEVELS[index];
    const w = wingOf(level);
    if (isDev() || save.completed.includes(level?.id)) return true;
    if (w === 4) {
        if (!halloweenLive()) return false;
        const i = HW_LEVELS.findIndex((item) => item.id === level.id);
        return i === 0 || save.completed.includes(HW_LEVELS[i - 1]?.id);
    }
    if (w > 3) return false;
    if (w === 2 && !workshop2Open()) return false;
    if (w === 3 && !workshop3Open()) return false;
    const first3 = LEVELS.findIndex((item) => wingOf(item) === 3);
    const gate = workshop3Open() && first3 >= 0 ? first3 : 0;
    return index <= Math.max(save.unlocked, gate);
}

function wingOf(level) {
    return level.wing || 1;
}

function workshop2Open() {
    return isDev() || LEVELS.filter((level) => wingOf(level) === 1).every((level) => save.completed.includes(level.id));
}

function workshop3Open() {
    return isDev() || LEVELS.filter((level) => wingOf(level) === 2).every((level) => save.completed.includes(level.id));
}

function playableLevels() {
    return LEVELS.filter((level) => wingOf(level) < 4);
}

function lastPlayableIndex() {
    let last = 0;
    LEVELS.forEach((level, i) => {
        if (wingOf(level) < 4) last = i;
    });
    return last;
}

function nextAfterWin() {
    if (state.dailyMode) return null;
    const wing = wingOf(currentLevel());
    if (wing === 4) {
        for (let i = state.levelIndex + 1; i < LEVELS.length; i++) {
            if (wingOf(LEVELS[i]) === 4) return i;
        }
        return null;
    }
    if (wing > 3) return null;
    if (state.levelIndex >= lastPlayableIndex()) return null;
    return state.levelIndex + 1;
}

function moscowDateKey() {
    return todayIso();
}

function dailyLevelIndex() {
    return octIndexForIso(todayIso(), OCT_LEVELS.length);
}

function currentLevel() {
    const pack = state.dailyMode ? OCT_LEVELS : LEVELS;
    const i = Math.max(0, Math.min(state.levelIndex, pack.length - 1));
    return pack[i];
}

function calRecord(iso) {
    return save.calDays?.[iso] || null;
}

function calAdOpen(iso) {
    return Boolean(save.calAds?.[iso]);
}

function calStatus(iso) {
    const today = todayIso();
    if (calRecord(iso)?.moves) return "done";
    if (iso > today) return isDev() ? "open" : "future";
    if (iso === today) return "today";
    if (calAdOpen(iso) || isDev()) return "open";
    return "missed";
}

function dailyDoneToday() {
    const today = todayIso();
    return Boolean(calRecord(today)?.moves) || (save.dailyDate === today && Number(save.dailyBest) > 0);
}

function syncAdHelps() {
    const today = todayIso();
    if (save.adHelpDate !== today) {
        save.adHelpDate = today;
        save.adHelps = 0;
        persist();
    }
    return readCount(save.adHelps, 0);
}

function adHelpsLeft() {
    return Math.max(0, AD_HELP_MAX - syncAdHelps());
}

function adHelpBlocked() {
    return adHelpsLeft() <= 0;
}

function paintUses(el, count, { hidden = false, wantAd = false } = {}) {
    if (!el) return;
    if (hidden) {
        el.hidden = true;
        return;
    }
    el.hidden = false;
    if (count > 0) {
        el.classList.remove("uses-ico");
        el.textContent = String(count);
        return;
    }
    el.classList.add("uses-ico");
    el.innerHTML = wantAd && !adHelpBlocked()
        ? '<svg class="ico"><use href="#i-ad"/></svg>'
        : '<svg class="ico"><use href="#i-ad-off"/></svg>';
}

function ownedFrames() {
    const owned = Array.isArray(save.framesOwned) ? save.framesOwned.slice() : ["oak"];
    if (!owned.includes("oak")) owned.unshift("oak");
    save.framesOwned = owned;
    if (!owned.includes(save.frame)) save.frame = "oak";
    return owned;
}

function currentFrame() {
    ownedFrames();
    return save.frame || "oak";
}

function applyFrameSkin(el) {
    if (!el) return;
    [...el.classList].filter((cls) => cls.startsWith("skin-")).forEach((cls) => el.classList.remove(cls));
    el.classList.add(`skin-${currentFrame()}`);
}

function setDev(on, { silent = false } = {}) {
    save.dev = on;
    persist();
    renderMenu();
    if (screen === "gallery") renderGallery();
    if (screen === "bonus") renderCalendar();
    if (!silent) {
        toast(on ? "Режим мастера: все картины открыты" : "Режим мастера выключен");
    }
}

function isReturner() {
    return Boolean(save.seenHowto)
        || Number(save.unlocked) > 0
        || (Array.isArray(save.completed) && save.completed.length > 0)
        || Number(save.coins) > 0;
}

function maybeShowNews() {
    const news = $("news");
    if (!news) return;
    if (new URLSearchParams(location.search).has("shot")) return;
    if (save.seenNews === NEWS_ID || !isReturner()) {
        news.classList.remove("show");
        return;
    }
    news.classList.add("show");
}

function closeNews() {
    save.seenNews = NEWS_ID;
    persist();
    $("news")?.classList.remove("show");
}

function nextPlayIndex() {
    const last = lastPlayableIndex();
    const playable = playableLevels();
    if (playable.every((level) => save.completed.includes(level.id))) return 0;
    for (let i = 0; i <= save.unlocked && i <= last; i++) {
        if (wingOf(LEVELS[i]) >= 4) continue;
        if (!save.completed.includes(LEVELS[i].id)) return i;
    }
    return Math.min(save.unlocked, last);
}

function showScreen(name) {
    screen = name;
    if (name !== "play") ui.overlay.classList.remove("show");
    Object.entries(ui.screens).forEach(([key, el]) => {
        el.classList.toggle("active", key === name);
    });
    if (name === "menu") {
        renderMenu();
        maybeShowNews();
    } else {
        $("news")?.classList.remove("show");
    }
    if (name === "gallery") renderGallery();
    if (name === "bonus") renderCalendar();
    if (name === "shop") renderShop();
    if (name === "play" && !state.won) platform.gameplayStart();
    else platform.gameplayStop();
}

function renderMenu() {
    const playable = playableLevels();
    const donePlay = save.completed.filter((id) => playable.some((level) => level.id === id)).length;
    ui.menuProgress.textContent = isDev()
        ? `Мастер · ${save.completed.length} / ${LEVELS.length}`
        : `Картины ${donePlay} / ${playable.length}`;
    ui.menuCoins.textContent = String(save.coins);
    const today = todayIso();
    const daily = OCT_LEVELS[dailyLevelIndex()];
    const { m, day } = moscowParts();
    const dailyEl = $("daily-meta");
    const dailyBtn = $("daily-btn");
    if (dailyBtn) dailyBtn.textContent = dailyDoneToday() ? "Результат дня" : "Картина дня";
    if (dailyEl) {
        dailyEl.textContent = dailyDoneToday()
            ? `${day} ${MONTHS_RU[m - 1].toLowerCase()} · ${daily.title} · ${formatMoves(calRecord(today)?.moves || save.dailyBest)}`
            : `Сегодня ${day} · ${daily.title}`;
    }
    const nxt = nextPlayIndex();
    const allDone = playable.every((level) => save.completed.includes(level.id));
    ui.playBtn.textContent = allDone
        ? "Играть снова"
        : (donePlay === 0 ? "Играть" : `Продолжить · ${LEVELS[nxt].title}`);
    $("dev-panel").hidden = !isDev();
    $("dev-mark").classList.toggle("dev-on", isDev());
    const stats = $("dev-stats");
    if (stats) stats.href = "https://mosaelia.ru/stats/?k=ms2026";
    const chip = $("platform-chip");
    const forced = new URLSearchParams(location.search).has("platform");
    chip.hidden = !(isDev() || forced);
    chip.textContent = `Площадка: ${platform.id}`;
    syncHalloweenUi();
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

function renderGallery() {
    syncHalloweenUi();
    ui.galleryGrid.replaceChildren();
    const sheet = $("gallery-sheet");
    if (![1, 2, 3, 4, 5].includes(galleryPage)) galleryPage = 1;
    ui.galleryPage1?.classList.toggle("on", galleryPage === 1);
    ui.galleryPage2?.classList.toggle("on", galleryPage === 2);
    ui.galleryPage3?.classList.toggle("on", galleryPage === 3);
    ui.galleryPageHw?.classList.toggle("on", galleryPage === 4);
    ui.galleryPageSoon?.classList.toggle("on", galleryPage === 5);
    if (galleryPage === 5) {
        if (sheet) sheet.textContent = "Скоро";
        const empty = document.createElement("div");
        empty.className = "gallery-soon";
        empty.innerHTML = '<svg class="ico"><use href="#i-lock"/></svg><p>Скоро</p>';
        ui.galleryGrid.appendChild(empty);
        return;
    }
    const wing = galleryPage;
    if (sheet) {
        if (wing === 1) sheet.textContent = "Мастерская 1";
        else if (wing === 2) {
            sheet.textContent = workshop2Open() ? "Мастерская 2" : "Мастерская 2 · после первой";
        } else if (wing === 3) {
            sheet.textContent = workshop3Open() ? "Мастерская 3" : "Мастерская 3 · после второй";
        } else if (wing === 4) sheet.textContent = "Хэллоуин";
    }
    LEVELS.forEach((level, index) => {
        if (wingOf(level) !== wing) return;
        const done = save.completed.includes(level.id);
        const coming = false;
        const open = isUnlocked(index);
        const card = document.createElement("div");
        card.className = `gallery-card${open ? "" : " locked"}${done ? " done" : ""}`;
        const play = document.createElement("button");
        play.type = "button";
        play.className = "gallery-play";
        play.disabled = !open;
        const frame = document.createElement("div");
        frame.className = "gallery-frame";
        applyFrameSkin(frame);
        frame.appendChild(miniMosaic(level, done || isDev()));
        if (save.cleanRuns?.[level.id]) {
            const badge = document.createElement("span");
            badge.className = "gallery-clean";
            badge.title = "Чистый проход";
            badge.innerHTML = '<svg class="ico"><use href="#i-leaf"/></svg>';
            frame.appendChild(badge);
        }
        if (!open) {
            const lock = document.createElement("span");
            lock.className = "gallery-lock";
            lock.setAttribute("aria-hidden", "true");
            lock.innerHTML = '<svg class="ico"><use href="#i-lock"/></svg>';
            frame.appendChild(lock);
        }
        const n = LEVELS.filter((item) => wingOf(item) < wing).length;
        const title = document.createElement("div");
        title.className = "gallery-title";
        title.textContent = coming ? "Скоро" : (open ? `${index - n + 1}. ${level.title}` : "Закрыто");
        play.append(frame, title);
        const best = save.bestMoves?.[level.id];
        if (open) {
            play.addEventListener("click", () => enterPlay(index));
        }
        card.append(play);
        if (open) {
            const foot = document.createElement("div");
            foot.className = "gallery-foot";
            if (best) {
                const meta = document.createElement("span");
                meta.className = "gallery-meta";
                meta.textContent = formatMoves(best);
                foot.append(meta);
            }
            const rankBtn = document.createElement("button");
            rankBtn.type = "button";
            rankBtn.className = "gallery-rank-btn";
            rankBtn.setAttribute("aria-label", `Рейтинг: ${level.title}`);
            rankBtn.innerHTML = '<svg class="ico"><use href="#i-bars"/></svg>';
            rankBtn.addEventListener("click", () => showPictureRanks(index));
            foot.append(rankBtn);
            card.append(foot);
        }
        ui.galleryGrid.appendChild(card);
    });
}

function renderShop() {
    const grid = $("shop-grid");
    const coinsEl = $("shop-coins");
    if (coinsEl) coinsEl.textContent = `${save.coins} монет`;
    if (!grid) return;
    const owned = ownedFrames();
    grid.replaceChildren();
    FRAMES.forEach((item) => {
        const have = owned.includes(item.id);
        const on = currentFrame() === item.id;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `shop-card${on ? " on" : ""}`;
        const swatch = document.createElement("div");
        swatch.className = `shop-swatch gallery-frame skin-${item.id}`;
        const name = document.createElement("div");
        name.className = "shop-name";
        name.textContent = item.name;
        const price = document.createElement("div");
        price.className = "shop-price";
        price.textContent = on ? "Надето" : (have ? "Надеть" : `${item.price} монет`);
        btn.append(swatch, name, price);
        btn.addEventListener("click", () => {
            if (have) {
                save.frame = item.id;
                persist();
                renderShop();
                toast(`Рамка «${item.name}»`);
                return;
            }
            if (save.coins < item.price) {
                toast("Нужно больше монет");
                return;
            }
            save.coins -= item.price;
            save.framesOwned = [...owned, item.id];
            save.frame = item.id;
            persist();
            renderMenu();
            renderShop();
            toast(`Куплена рамка «${item.name}»`);
        });
        grid.appendChild(btn);
    });
}

function enterPlay(index, { fromHowto = false, daily = false, calIso = "", back } = {}) {
    if (daily) pendingDaily = true;
    if (calIso) pendingCalIso = calIso;
    if (back) overlayBack = back;
    if (!fromHowto && !save.seenHowto) {
        showScreen("howto");
        return;
    }
    if (fromHowto) {
        save.seenHowto = true;
        persist();
    }
    const useDaily = pendingDaily;
    const iso = pendingCalIso || (useDaily ? todayIso() : "");
    pendingDaily = false;
    pendingCalIso = "";
    const idx = iso ? octIndexForIso(iso, OCT_LEVELS.length) : index;
    if (!iso && !isUnlocked(idx)) {
        toast("Этот лист ещё закрыт");
        return;
    }
    showScreen("play");
    startLevel(idx, { daily: useDaily, calIso: iso, back: back || overlayBack });
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
        extraAdUsed: state.extraAdUsed,
        moves: state.moves,
        usedShuffle: state.usedShuffle,
        usedWand: state.usedWand,
        dailyMode: state.dailyMode,
        calIso: state.calIso
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

function startLevel(index, { daily = false, calIso = "", back } = {}) {
    const pack = daily ? OCT_LEVELS : LEVELS;
    const safe = Math.max(0, Math.min(index, pack.length - 1));
    const level = pack[safe];
    state.levelIndex = safe;
    state.dailyMode = Boolean(daily);
    state.calIso = daily ? (calIso || todayIso()) : "";
    if (state.calIso) overlayBack = back || "bonus";
    else if (!daily && wingOf(level) === 4) {
        overlayBack = back || "gallery";
        galleryPage = 4;
    } else overlayBack = back || "menu";
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
    applyBoostersFromSave();
    state.extraAdUsed = false;
    state.history = [];
    state.won = false;
    state.claimed = false;
    state.moves = 0;
    state.usedShuffle = false;
    state.usedWand = false;
    state.payout = REWARD;
    ui.overlay.classList.remove("show");
    ui.frame.classList.remove("complete");
    applyFrameSkin(ui.frame);

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
    requestAnimationFrame(() => {
        fitPlayMosaic();
        renderStacks();
    });
    if (screen === "play") platform.gameplayStart();
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
    const level = currentLevel();
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
    const level = currentLevel();
    ui.levelName.textContent = state.calIso
        ? `${Number(state.calIso.slice(-2))} ${MONTHS_RU[Number(state.calIso.slice(5, 7)) - 1].toLowerCase()} · ${level.title}`
        : (state.dailyMode
            ? `Картина дня · ${level.title}`
            : `Картина ${state.levelIndex + 1} · ${level.title}`);
    applyFrameSkin(ui.frame);
    ui.coins.textContent = String(save.coins);
    if (ui.moves) ui.moves.textContent = String(state.moves);
    ui.hint.textContent = state.hand
        ? "Теперь выложи её в канавку — в том числе в пустую"
        : HINT;
    ui.deck.classList.toggle("empty", state.deck.length === 0);
    ui.deckCount.textContent = String(state.deck.length);
    ui.deck.disabled = busy || state.won || state.deck.length === 0 || Boolean(state.hand);
    const adWait = adHelpBlocked();
    const shuffleAd = state.shuffles <= 0;
    const undoAd = state.undos <= 0;
    const wandAd = state.wands <= 0;
    const extraAd = state.extraUsed && !state.extraAdUsed;
    paintUses(ui.shuffleUses, state.shuffles, { wantAd: shuffleAd });
    paintUses(ui.undoUses, state.undos, { wantAd: undoAd });
    paintUses(ui.wandUses, state.wands, { wantAd: wandAd });
    paintUses(ui.extraUses, extraAd ? 0 : 1, { hidden: state.extraUsed && state.extraAdUsed, wantAd: extraAd });
    ui.shuffle.classList.toggle("booster-ad", shuffleAd && !adWait);
    ui.undo.classList.toggle("booster-ad", undoAd && !adWait);
    ui.wand.classList.toggle("booster-ad", wandAd && !adWait);
    ui.extra.classList.toggle("booster-ad", extraAd && !adWait);
    ui.shuffle.classList.toggle("booster-wait", shuffleAd && adWait);
    ui.undo.classList.toggle("booster-wait", undoAd && adWait);
    ui.wand.classList.toggle("booster-wait", wandAd && adWait);
    ui.extra.classList.toggle("booster-wait", extraAd && adWait);
    ui.shuffle.disabled = busy || state.won || paused;
    ui.undo.disabled = busy || state.won || paused || (state.undos <= 0 && !state.history.length && !undoAd);
    ui.wand.disabled = busy || state.won || paused;
    ui.extra.disabled = busy || state.won || paused || (state.extraUsed && state.extraAdUsed);
    ui.mute.classList.toggle("is-muted", save.mute);
    ui.mute.setAttribute("aria-label", save.mute ? "Включить звук" : "Выключить звук");
    renderMosaic();
    fitPlayMosaic();
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

function noteMove() {
    state.moves += 1;
}

function parFor(level) {
    return tilesFor(level).length;
}

function starsFor(moves, par) {
    if (moves <= par) return 3;
    if (moves <= Math.ceil(par * 1.35)) return 2;
    return 1;
}

function formatMoves(n) {
    const m = Number(n) || 0;
    const mod10 = m % 10;
    const mod100 = m % 100;
    let word = "ходов";
    if (mod100 < 11 || mod100 > 14) {
        if (mod10 === 1) word = "ход";
        else if (mod10 >= 2 && mod10 <= 4) word = "хода";
    }
    return `${m} ${word}`;
}

function masteryScore() {
    return LEVELS.reduce((sum, level, index) => {
        const best = Number(save.bestMoves?.[level.id]);
        if (!best) return sum;
        return sum + Math.max(0, parFor(level) * 4 - best) + (index + 1);
    }, 0);
}

function paintWinStars(count) {
    if (!ui.winStars) return;
    [...ui.winStars.querySelectorAll("span")].forEach((el, i) => {
        el.classList.toggle("on", i < count);
    });
}

function rankPlace(rows, id, moves) {
    const board = (Array.isArray(rows) ? rows : []).map((row) => ({
        id: String(row.id || ""),
        moves: Number(row.moves) || 9999
    }));
    const mine = String(id || "");
    const at = board.findIndex((row) => row.id === mine);
    if (at >= 0) board[at].moves = Number(moves) || 9999;
    else board.push({ id: mine, moves: Number(moves) || 9999 });
    board.sort((a, b) => a.moves - b.moves);
    const i = board.findIndex((row) => row.id === mine);
    return i >= 0 ? i + 1 : 0;
}

async function rankClimbPrize(levelId, oldMoves, newMoves) {
    if (!oldMoves || !(newMoves < oldMoves)) return 0;
    const rows = await fetchRanks(levelId);
    const me = guestId();
    const oldPlace = rankPlace(rows, me, oldMoves);
    const newPlace = rankPlace(rows, me, newMoves);
    if (newPlace && oldPlace && newPlace < oldPlace) {
        return Math.min(RANK_PLACE_CAP, (oldPlace - newPlace) * RANK_PLACE_COIN);
    }
    return 0;
}

async function finishLevel() {
    const level = currentLevel();
    const id = level.id;
    const first = !save.completed.includes(id);
    if (!state.dailyMode && first) save.completed.push(id);
    if (!state.dailyMode && wingOf(level) < 4) {
        save.unlocked = Math.max(save.unlocked, Math.min(state.levelIndex + 1, lastPlayableIndex()));
    }
    const moves = state.moves;
    const par = parFor(level);
    const stars = starsFor(moves, par);
    const prev = Number(save.bestMoves?.[id]) || 0;
    const record = !prev || moves < prev;
    const clean = !state.usedShuffle && !state.usedWand;
    if (!save.bestMoves) save.bestMoves = {};
    if (!save.bestStars) save.bestStars = {};
    if (!save.cleanRuns) save.cleanRuns = {};
    if (record) save.bestMoves[id] = moves;
    save.bestStars[id] = Math.max(Number(save.bestStars[id]) || 0, stars);
    const newClean = clean && !save.cleanRuns[id];
    if (clean) save.cleanRuns[id] = true;
    const today = todayIso();
    let bonus = 0;
    let payout = REWARD;
    let firstDay = false;
    let rankPrize = 0;
    let replay = false;
    if (state.dailyMode) {
        const iso = state.calIso || today;
        if (!save.calDays) save.calDays = {};
        const prevDay = save.calDays[iso]
            || (iso === today && Number(save.dailyBest) > 0 ? { moves: Number(save.dailyBest) } : null);
        firstDay = !prevDay?.moves;
        replay = !firstDay;
        if (firstDay) {
            if (newClean) bonus += CLEAN_BONUS;
            bonus += DAILY_BONUS;
            payout = REWARD + bonus;
        } else {
            rankPrize = await rankClimbPrize(id, Number(prevDay.moves), moves);
            payout = REPLAY_REWARD + rankPrize;
            bonus = rankPrize;
        }
        if (!prevDay?.moves || moves < prevDay.moves) {
            save.calDays[iso] = { moves, stars, clean, level: id };
        } else if (clean && !prevDay.clean) {
            save.calDays[iso] = { ...prevDay, clean: true, stars: Math.max(prevDay.stars || 0, stars) };
        }
        if (iso === today) {
            save.dailyDate = today;
            save.dailyBest = save.calDays[iso].moves;
            save.dailyLevel = id;
            save.dailyStars = save.calDays[iso].stars;
            save.dailyClean = Boolean(save.calDays[iso].clean);
        }
    } else if (!first) {
        replay = true;
        rankPrize = await rankClimbPrize(id, prev, moves);
        payout = REPLAY_REWARD + rankPrize;
        bonus = rankPrize;
    } else {
        if (newClean) bonus += CLEAN_BONUS;
        payout = REWARD + bonus;
    }
    state.payout = payout;
    persist();
    platform.submitScore?.(masteryScore());
    track("complete", {
        platform: platform.id,
        level: id,
        first,
        total: save.completed.length,
        moves,
        record: record ? 1 : 0,
        clean: clean ? 1 : 0,
        name: platform.playerName?.() || ""
    });
    return { moves, par, stars, record, prev, clean, bonus, payout, firstDay, rankPrize, replay };
}

function paintRankList(rows, mine) {
    const list = ui.winRankList;
    if (!list) return;
    list.replaceChildren();
    const me = guestId();
    const myName = platform.playerName?.() || "Ты";
    let board = Array.isArray(rows) ? rows.slice() : [];
    if (mine && Number(mine.moves) > 0) {
        const found = board.findIndex((row) => row.id === me);
        if (found >= 0) {
            if (mine.moves < Number(board[found].moves) || !board[found].moves) {
                board[found] = {
                    ...board[found],
                    name: board[found].name || myName,
                    moves: mine.moves,
                    clean: mine.clean ? 1 : board[found].clean
                };
            }
        } else {
            board.push({
                id: me,
                name: myName,
                moves: mine.moves,
                clean: mine.clean ? 1 : 0
            });
        }
        board.sort((a, b) => Number(a.moves) - Number(b.moves));
    }
    if (!board.length) {
        const empty = document.createElement("li");
        empty.className = "rank-empty";
        empty.textContent = "Ты первый в рейтинге этой картины.";
        list.appendChild(empty);
        return;
    }
    board.forEach((row, i) => {
        const li = document.createElement("li");
        if (row.id === me) li.classList.add("me");
        const who = row.id === me ? "Ты" : row.name;
        li.innerHTML = `<span class="rank-n">${i + 1}</span><span>${who}${row.clean ? " · лист" : ""}</span><span>${formatMoves(row.moves)}</span>`;
        list.appendChild(li);
    });
}

async function loadWinRanks(mine) {
    const id = currentLevel()?.id;
    const fallback = mine || (state.moves
        ? { moves: state.moves, clean: !state.usedShuffle && !state.usedWand }
        : { moves: save.dailyBest, clean: save.dailyClean });
    if (ui.winRankList && !ui.winRankList.children.length) {
        const loading = document.createElement("li");
        loading.className = "rank-empty";
        loading.textContent = "Загружаем рейтинг…";
        ui.winRankList.appendChild(loading);
    }
    const rows = id ? await fetchRanks(id) : [];
    paintRankList(rows, fallback);
}

function fillWinSheet({ title, copy, movesText, clean, stars, rewardText, claimText, retryText, caption, hideRewards = false }) {
    ui.winTitle.textContent = title;
    ui.winCopy.textContent = copy;
    if (ui.winMoves) ui.winMoves.textContent = movesText;
    if (ui.winClean) {
        ui.winClean.hidden = !clean;
        ui.winClean.textContent = clean ? "Чистый проход" : "";
    }
    paintWinStars(stars);
    ui.reward.textContent = rewardText;
    ui.claim.textContent = claimText;
    ui.claim.hidden = hideRewards;
    const rewards = document.querySelector(".win-rewards");
    if (rewards) rewards.hidden = hideRewards;
    ui.retry.textContent = retryText;
    if (ui.rankCaption) ui.rankCaption.textContent = caption;
    if (ui.winShare) ui.winShare.classList.toggle("show", platform.id === "vk");
}

function closeWinSheet() {
    ui.overlay.classList.remove("show");
    browsingRanks = false;
    const back = overlayBack || "menu";
    if (screen === "play") {
        if (back === "calendar" || back === "gallery-oct" || back === "bonus") {
            showScreen("bonus");
        } else if (back === "gallery") showScreen("gallery");
        else showScreen("menu");
    }
}

function showPictureRanks(index) {
    const level = LEVELS[index];
    const moves = Number(save.bestMoves?.[level.id]) || 0;
    overlayBack = screen === "play" ? "menu" : screen;
    browsingRanks = true;
    state.levelIndex = index;
    state.dailyMode = false;
    state.won = true;
    state.claimed = true;
    state.moves = moves;
    fillWinSheet({
        title: level.title,
        copy: "Общий рейтинг всех игроков. Чем меньше ходов — тем выше место.",
        movesText: moves ? `Твой лучший: ${formatMoves(moves)}` : "Ещё нет личного результата",
        clean: Boolean(save.cleanRuns?.[level.id]),
        stars: 3,
        rewardText: "",
        claimText: "Закрыть",
        retryText: "Играть",
        caption: "Рейтинг всех игроков",
        hideRewards: true
    });
    if (ui.winRankList) ui.winRankList.replaceChildren();
    loadWinRanks({
        moves,
        clean: Boolean(save.cleanRuns?.[level.id])
    });
    ui.overlay.classList.add("show");
}

function showCalRecap(iso, back = "bonus") {
    const index = octIndexForIso(iso, OCT_LEVELS.length);
    const level = OCT_LEVELS[index];
    const rec = calRecord(iso) || {};
    const moves = Number(rec.moves) || 0;
    overlayBack = back;
    browsingRanks = true;
    state.levelIndex = index;
    state.dailyMode = true;
    state.calIso = iso;
    state.won = true;
    state.claimed = true;
    state.moves = moves;
    const day = Number(iso.slice(-2));
    const month = MONTHS_RU[Number(iso.slice(5, 7)) - 1];
    fillWinSheet({
        title: level.title,
        copy: `${day} ${month.toLowerCase()}. Общий рейтинг всех игроков.`,
        movesText: moves ? `Твой результат: ${formatMoves(moves)}` : "Ещё нет результата",
        clean: Boolean(rec.clean),
        stars: 3,
        rewardText: "Награда уже получена",
        claimText: "Закрыть",
        retryText: "Сыграть ещё раз",
        caption: "Рейтинг всех игроков",
        hideRewards: true
    });
    if (ui.winRankList) ui.winRankList.replaceChildren();
    loadWinRanks({ moves, clean: rec.clean });
    ui.overlay.classList.add("show");
}

function showDailyRecap() {
    showCalRecap(todayIso(), "menu");
}

function renderCalendar() {
    const grid = $("cal-grid");
    if (!grid) return;
    const { y, m } = octMonthParts();
    const sheet = $("bonus-sheet");
    if (sheet) sheet.textContent = `${MONTHS_RU[m - 1]} ${y}`;
    const today = todayIso();
    const startPad = mondayIndex(y, m, 1);
    const count = daysInMonth(y, m);
    grid.replaceChildren();
    for (let i = 0; i < startPad; i++) {
        const pad = document.createElement("div");
        pad.className = "cal-pad";
        grid.appendChild(pad);
    }
    for (let d = 1; d <= count; d++) {
        const iso = isoDay(y, m, d);
        const st = calStatus(iso);
        const level = OCT_LEVELS[octIndexForIso(iso, OCT_LEVELS.length)];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `cal-day ${st}`;
        btn.disabled = st === "future";
        const n = document.createElement("span");
        n.className = "cal-n";
        n.textContent = String(d);
        const mark = document.createElement("span");
        mark.className = "cal-mark";
        if (st === "done") mark.textContent = "готово";
        else if (st === "today") mark.textContent = iso === today ? "сегодня" : level.title;
        else if (st === "open") mark.textContent = "играть";
        else if (st === "missed") mark.textContent = "реклама";
        else {
            mark.classList.add("cal-lock-mark");
            mark.innerHTML = '<svg class="ico cal-lock" aria-hidden="true"><use href="#i-lock"/></svg>';
        }
        btn.append(n, mark);
        if (st !== "future") {
            btn.addEventListener("click", () => onCalDayClick(iso));
        }
        grid.appendChild(btn);
    }
}

async function onCalDayClick(iso) {
    const st = calStatus(iso);
    if (st === "future") {
        toast("Новые дни открываются только по числу");
        return;
    }
    if (st === "missed") {
        busy = true;
        const ok = await runAd("rewarded");
        busy = false;
        if (!ok) {
            toast("Ролик не показался — день пока закрыт");
            return;
        }
        if (!save.calAds) save.calAds = {};
        save.calAds[iso] = 1;
        persist();
        toast("Пропущенный день открыт");
        enterPlay(octIndexForIso(iso, OCT_LEVELS.length), { daily: true, calIso: iso, back: "bonus" });
        return;
    }
    if (st === "done") {
        showCalRecap(iso);
        return;
    }
    enterPlay(octIndexForIso(iso, OCT_LEVELS.length), { daily: true, calIso: iso, back: "bonus" });
}

async function checkWin() {
    if (!state.mosaic.every((c) => c.filled)) return;
    state.won = true;
    browsingRanks = false;
    if (state.dailyMode) overlayBack = overlayBack || "menu";
    else if (wingOf(currentLevel()) === 4) overlayBack = overlayBack || "gallery";
    else overlayBack = "menu";
    const result = await finishLevel();
    platform.gameplayStop();
    ui.frame.classList.add("complete");
    const nxt = nextAfterWin();
    const last = !state.dailyMode && nxt === null;
    const hw = !state.dailyMode && wingOf(currentLevel()) === 4;
    const openedWing2 = !state.dailyMode && wingOf(currentLevel()) === 1 && workshop2Open();
    const openedWing3 = !state.dailyMode && currentLevel().id === "aurora" && workshop3Open();
    const bits = [];
    if (result.replay) {
        bits.push(`+${REPLAY_REWARD} монет`);
        if (result.rankPrize) bits.push(`+${result.rankPrize} за место`);
    } else {
        bits.push(`+${REWARD} монет`);
        if (result.bonus) bits.push(`+${result.bonus} бонус`);
    }
    const replayCopy = result.rankPrize
        ? "Место в рейтинге выросло — вот приз за это."
        : "Повтор: 5 монет. Приз будет, если поднимешься в рейтинге.";
    if (state.dailyMode) {
        fillWinSheet({
            title: "Картина дня готова!",
            copy: result.firstDay
                ? "Вот твой результат и рейтинг. Повтор — 5 монет, приз за более высокое место."
                : replayCopy,
            movesText: result.record
                ? `Новый рекорд: ${formatMoves(result.moves)}`
                : `${formatMoves(result.moves)} · лучший ${formatMoves(result.prev || result.moves)}`,
            clean: result.clean,
            stars: result.stars,
            rewardText: bits.join(" · "),
            claimText: "Забрать награду",
            retryText: "Улучшить результат",
            caption: "Рейтинг картины дня"
        });
    } else if (hw) {
        fillWinSheet({
            title: last ? "Хэллоуин собран!" : "Картина готова!",
            copy: last
                ? "Все хэллоуинские картины можно снова открыть в галерее."
                : (result.replay ? replayCopy : "Мозаика собрана. В галерее лист «Хэл»."),
            movesText: result.record
                ? `Новый рекорд: ${formatMoves(result.moves)}`
                : `${formatMoves(result.moves)} · лучший ${formatMoves(result.prev || result.moves)}`,
            clean: result.clean,
            stars: result.stars,
            rewardText: bits.join(" · "),
            claimText: "Забрать награду",
            retryText: "Ещё раз эту картину",
            caption: "Рейтинг картины"
        });
    } else {
        fillWinSheet({
            title: last
                ? "Королевство полно!"
                : (openedWing3
                    ? "Мастерская 2 готова!"
                    : (openedWing2 && currentLevel().id === "night" ? "Мастерская 1 готова!" : "Картина готова!")),
            copy: last
                ? "Все картины собраны. Их можно снова открыть в галерее."
                : (openedWing3
                    ? "Третья мастерская открыта в галерее."
                    : (openedWing2 && currentLevel().id === "night"
                        ? "Вторая мастерская открыта в галерее."
                        : (result.replay ? replayCopy : "Мозаика собрана и повешена в галерею."))),
            movesText: result.record
                ? `Новый рекорд: ${formatMoves(result.moves)}`
                : `${formatMoves(result.moves)} · лучший ${formatMoves(result.prev || result.moves)}`,
            clean: result.clean,
            stars: result.stars,
            rewardText: bits.join(" · "),
            claimText: "Забрать награду",
            retryText: "Ещё раз эту картину",
            caption: "Рейтинг картины"
        });
    }
    if (ui.winRankList) ui.winRankList.replaceChildren();
    loadWinRanks({ moves: result.moves, clean: result.clean });
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
    noteMove();
    state.stacks[index].push(state.hand);
    state.hand = null;
    render();
    beep(320, 0.05, "sine", 0.03);
    await resolveMerges();
    await checkWin();
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
    noteMove();
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
    noteMove();
    state.hand = state.deck.shift();
    beep(300, 0.05, "sine", 0.03);
    render();
}

async function runAd(kind) {
    paused = true;
    audioCtx?.suspend();
    platform.gameplayStop();
    render();
    try {
        if (kind === "rewarded") return await platform.showRewarded();
        return await platform.showInterstitial();
    } catch {
        return false;
    } finally {
        paused = false;
        if (!document.hidden) audioCtx?.resume();
        if (screen === "play" && !state.won) platform.gameplayStart();
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
    syncBoosters();
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
    state.usedShuffle = true;
    syncBoosters();
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
    noteMove();
    state.wands -= 1;
    state.usedWand = true;
    syncBoosters();
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
    await checkWin();
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
    syncBoosters();
    beep(500, 0.08);
    render();
    toast("Ещё одна канавка");
}

async function refillWithAd(kind, okText) {
    if (busy) return;
    if (adHelpBlocked()) {
        toast("Завтра снова");
        render();
        return;
    }
    busy = true;
    render();
    const ok = await runAd("rewarded");
    busy = false;
    if (!ok) {
        toast("Реклама не показалась — можно играть и так");
        render();
        return;
    }
    save.adHelps = syncAdHelps() + 1;
    persist();
    if (kind === "shuffles") state.shuffles += 1;
    if (kind === "undos") state.undos += 1;
    if (kind === "wands") state.wands += 1;
    if (kind === "extra") {
        pushHistory();
        state.extraAdUsed = true;
        state.stacks.push([]);
    }
    syncBoosters();
    beep(500, 0.08);
    render();
    toast(okText);
}

async function claimReward() {
    if (state.claimed && browsingRanks) {
        closeWinSheet();
        return;
    }
    if (state.claimed && (screen === "menu" || screen === "gallery" || screen === "bonus")) {
        closeWinSheet();
        return;
    }
    if (!state.claimed) {
        state.claimed = true;
        save.coins += state.payout || REWARD;
        persist();
        ui.coins.textContent = String(save.coins);
        renderMenu();
        const nxt = nextAfterWin();
        ui.claim.textContent = state.dailyMode || !nxt ? "В меню" : "Следующая картина";
        beep(700, 0.12);
        return;
    }
    const nxt = nextAfterWin();
    if (state.dailyMode || !nxt) {
        closeWinSheet();
        return;
    }
    ui.claim.disabled = true;
    if (save.completed.length > 1) {
        await runAd("interstitial");
    }
    ui.claim.disabled = false;
    startLevel(nxt);
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
ui.retry.addEventListener("click", () => {
    ui.overlay.classList.remove("show");
    enterPlay(state.levelIndex, { daily: state.dailyMode, calIso: state.calIso });
});
ui.winMenu.addEventListener("click", () => {
    if (state.won && !state.claimed) {
        state.claimed = true;
        save.coins += state.payout || REWARD;
        persist();
    }
    closeWinSheet();
});
ui.menuBtn.addEventListener("click", () => {
    if (state.won && !state.claimed) {
        state.claimed = true;
        save.coins += state.payout || REWARD;
        persist();
    }
    closeWinSheet();
    if (screen === "play") showScreen("menu");
});
ui.mute.addEventListener("click", () => {
    save.mute = !save.mute;
    persist();
    render();
});
ui.winShare?.addEventListener("click", async () => {
    const level = currentLevel();
    const ok = await platform.share?.(
        `Мозаэлия: «${level.title}» за ${formatMoves(state.moves)}. Чем меньше ходов — тем выше место!`
    );
    if (!ok) toast("Поделиться можно в VK");
});

ui.playBtn.addEventListener("click", () => enterPlay(nextPlayIndex()));
$("daily-btn").addEventListener("click", () => {
    if (dailyDoneToday()) showDailyRecap();
    else enterPlay(dailyLevelIndex(), { daily: true, calIso: todayIso(), back: "menu" });
});
$("shop-btn").addEventListener("click", () => showScreen("shop"));
$("shop-back").addEventListener("click", () => showScreen("menu"));
$("howto-btn").addEventListener("click", () => showScreen("howto"));
$("howto-back").addEventListener("click", () => showScreen("menu"));
$("gallery-btn").addEventListener("click", () => {
    galleryPage = 1;
    showScreen("gallery");
});
$("gallery-back").addEventListener("click", () => showScreen("menu"));
$("bonus-btn").addEventListener("click", () => showScreen("bonus"));
$("bonus-back").addEventListener("click", () => showScreen("menu"));
$("gallery-page-1").addEventListener("click", () => {
    galleryPage = 1;
    renderGallery();
});
$("gallery-page-2").addEventListener("click", () => {
    galleryPage = 2;
    renderGallery();
});
$("gallery-page-3").addEventListener("click", () => {
    galleryPage = 3;
    renderGallery();
});
$("gallery-page-hw").addEventListener("click", () => {
    galleryPage = 4;
    renderGallery();
});
$("gallery-page-soon").addEventListener("click", () => {
    galleryPage = 5;
    renderGallery();
});
$("hw-banner")?.addEventListener("click", () => {
    galleryPage = 4;
    showScreen("gallery");
});
$("howto-play").addEventListener("click", () => enterPlay(nextPlayIndex(), { fromHowto: true }));
$("news-close").addEventListener("click", closeNews);
$("news-ok").addEventListener("click", closeNews);

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
    save.shuffles = SHUFFLE_MAX;
    save.undos = UNDO_MAX;
    save.wands = WAND_MAX;
    save.extraUsed = false;
    save.bestMoves = {};
    save.bestStars = {};
    save.cleanRuns = {};
    save.framesOwned = ["oak"];
    save.frame = "oak";
    save.dailyDate = "";
    save.dailyBest = 0;
    save.dailyLevel = "";
    save.dailyStars = 0;
    save.dailyClean = false;
    save.calDays = {};
    save.calAds = {};
    save.adHelpDate = "";
    save.adHelps = 0;
    save.seenNews = "";
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

syncViewport();
window.addEventListener("resize", syncViewport);
window.visualViewport?.addEventListener("resize", syncViewport);

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
        completed: LEVELS.slice(0, 6).map((level) => level.id),
        shuffles: SHUFFLE_MAX,
        undos: UNDO_MAX,
        wands: WAND_MAX,
        extraUsed: false,
        bestMoves: Object.fromEntries(LEVELS.slice(0, 6).map((level, i) => [level.id, 80 + i * 6])),
        bestStars: Object.fromEntries(LEVELS.slice(0, 6).map((level) => [level.id, 2]))
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
        if (ui.winMoves) ui.winMoves.textContent = "Новый рекорд: 86 ходов";
        paintWinStars(3);
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
        gallery3() {
            galleryPage = 3;
            showScreen("gallery");
        },
        halloween() {
            galleryPage = 4;
            showScreen("gallery");
        },
        soon() {
            galleryPage = 5;
            showScreen("gallery");
        },
        october() {
            showScreen("bonus");
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
