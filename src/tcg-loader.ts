import JSZip from 'jszip';
import type { TcgCard, TcgParsedCard, TcgMeta, TcgOpponentDeck, TcgFusionFormula, TcgLocaleOverrides, TcgShopJson, TcgCampaignJson, TcgGameRules, TcgLoadResult } from './types.js';
import { validateTcgArchive, validateCampaignJson, validateFusionFormulasJson } from './tcg-validator.js';

// ── Error Classes ───────────────────────────────────────────
/** Thrown when a .tcg file cannot be fetched from the network. */
export class TcgNetworkError extends Error {
  constructor(url: string, status: number) {
    super(`Failed to fetch ${url}: ${status}`);
    this.name = 'TcgNetworkError';
  }
}

/** Thrown when a .tcg file is structurally invalid (corrupt ZIP, failed validation, unsupported version). */
export class TcgFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TcgFormatError';
  }
}

// ── Constants ───────────────────────────────────────────────
const SUPPORTED_FORMAT_VERSION = 2;

// ── Helpers ─────────────────────────────────────────────────
// Load a metadata file
async function loadMetadataFile<T extends { key: string; value?: string }>(
  zip: JSZip,
  filename: string,
  lang: string,
  warnings: string[],
): Promise<T[] | undefined> {
  const file = zip.file(filename);
  if (!file) return undefined;
  try {
    const data: T[] = JSON.parse(await file.async('string'));
    const localeSuffix = filename.replace('.json', '');
    const localeFile = zip.file(`locales/${lang}_${localeSuffix}.json`);
    if (localeFile) {
      const overrides: TcgLocaleOverrides = JSON.parse(await localeFile.async('string'));
      for (const entry of data) {
        if (overrides[entry.key] !== undefined) (entry as { value: string }).value = overrides[entry.key];
      }
    }
    return data;
  } catch {
    warnings.push(`${filename}: failed to parse, using defaults`);
    return undefined;
  }
}

// Convert TcgCard + locale data into TcgParsedCard with all fields populated
function tcgCardToParsedCard(tc: TcgCard, name: string, description: string): TcgParsedCard {
  const parsed: TcgParsedCard = {
    id:          tc.id,
    name:        name || `Card #${tc.id}`,
    description: description || '',
    type:        tc.type,
    level:       tc.level,
    rarity:      tc.rarity,
  };
  if (tc.atk !== undefined) parsed.atk = tc.atk;
  if (tc.def !== undefined) parsed.def = tc.def;
  if (tc.attribute !== undefined) parsed.attribute = tc.attribute;
  if (tc.race !== undefined) parsed.race = tc.race;
  if (tc.effect) parsed.effect = tc.effect;
  if (tc.spirit) parsed.spirit = tc.spirit;
  if (tc.spellType !== undefined) parsed.spellType = tc.spellType;
  if (tc.trapTrigger !== undefined) parsed.trapTrigger = tc.trapTrigger;
  if (tc.target) parsed.target = tc.target;
  if (tc.atkBonus !== undefined) parsed.atkBonus = tc.atkBonus;
  if (tc.defBonus !== undefined) parsed.defBonus = tc.defBonus;
  if (tc.equipReqRace !== undefined) parsed.equipReqRace = tc.equipReqRace;
  if (tc.equipReqAttr !== undefined) parsed.equipReqAttr = tc.equipReqAttr;
  return parsed;
}

// ── Main Loader Function ───────────────────────────────────
/**
 * Load and validate a .tcg file from a URL or binary data, returning structured data for use in the engine.
 * @param source URL string or binary data of the .tcg file
 * @param options.lang Optional language code for locale overrides (e.g. 'en')    
 * @param options.onProgress Optional callback for progress updates (0-100) 
 */
export async function loadTcgFile(
  source: string | ArrayBuffer | Uint8Array,
  options?: { lang?: string; onProgress?: (percent: number) => void },
): Promise<TcgLoadResult> {
  const lang = options?.lang ?? '';
  const onProgress = options?.onProgress;

  // Fetch if URL
  let buffer: ArrayBuffer | Uint8Array;
  if (typeof source === 'string') {
    let response: Response;
    try {
      response = await fetch(source);
    } catch (e) {
      throw new TcgNetworkError(source, 0);
    }
    if (!response.ok) throw new TcgNetworkError(source, response.status);
    buffer = await response.arrayBuffer();
  } else if (ArrayBuffer.isView(source)) {
    buffer = new Uint8Array(source).buffer;
  } else {
    buffer = source;
  }
  onProgress?.(10);

  // Open ZIP
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (e) {
    throw new TcgFormatError(`Failed to open ZIP archive: ${e instanceof Error ? e.message : e}`);
  }
  onProgress?.(15);

  // Validate
  const result = await validateTcgArchive(zip);
  if (!result.valid || !result.contents) {
    throw new TcgFormatError(`Invalid .tcg file:\n${result.errors.join('\n')}`);
  }

  const { cards, opponentDescriptions, imageIds, localeOverrides } = result.contents;
  const warnings = result.warnings;

  // Lazy image loaders from zip (loaded on demand, cached after first access)
  const imageGetters = new Map<number, () => Promise<ArrayBuffer>>();
  const imageIdArr = [...imageIds];
  for (let i = 0; i < imageIdArr.length; i++) {
    const cardId = imageIdArr[i];
    const imgFile = zip.file(`img/${cardId}.png`);
    if (imgFile) {
      imageGetters.set(cardId, (() => {
        let cache: ArrayBuffer | null = null;
        return async () => {
          if (!cache) cache = await imgFile.async('arraybuffer');
          return cache;
        };
      })());
    }
    onProgress?.(20 + Math.round(((i + 1) / imageIdArr.length) * 35));
  }

  // Load meta.json if present
  let meta: TcgMeta | undefined;
  const metaFile = zip.file('meta.json');
  if (metaFile) {
    try {
      meta = JSON.parse(await metaFile.async('string'));
    } catch {
      warnings.push('meta.json: failed to parse, skipping');
    }
  }

  // Load starterDecks.json if present (standalone alternative to meta.starterDecks)
  let starterDecks: Record<string, number[]> | undefined;
  const starterDecksFile = zip.file('starterDecks.json');
  if (starterDecksFile) {
    try {
      starterDecks = JSON.parse(await starterDecksFile.async('string'));
    } catch {
      warnings.push('starterDecks.json: failed to parse, skipping');
    }
  }

  // Load rules.json if present — return as raw data, no application
  let rules: TcgGameRules | undefined;
  const rulesFile = zip.file('rules.json');
  if (rulesFile) {
    try {
      rules = JSON.parse(await rulesFile.async('string'));
    } catch {
      warnings.push('rules.json: failed to parse, skipping');
    }
  }

  // Load shop.json if present — return raw data, extract background images as ArrayBuffers
  let shopData: TcgShopJson | undefined;
  let rawShopBackgrounds: Map<string, ArrayBuffer> | undefined;
  const shopFile = zip.file('shop.json');
  if (shopFile) {
    try {
      shopData = JSON.parse(await shopFile.async('string'));
      if (shopData!.backgrounds) {
        rawShopBackgrounds = new Map();
        for (const [key, path] of Object.entries(shopData!.backgrounds)) {
          const bgFile = zip.file(path);
          if (bgFile) {
            rawShopBackgrounds.set(key, await bgFile.async('arraybuffer'));
          }
        }
      }
    } catch {
      warnings.push('shop.json: failed to parse, using defaults');
    }
  }

  let opponents: TcgOpponentDeck[] | undefined;
  const rootOppFile = zip.file('opponents.json');
  if (rootOppFile) {
    try {
      const data = JSON.parse(await rootOppFile.async('string'));
      if (Array.isArray(data)) {
        opponents = data;
        opponents.sort((a, b) => a.id - b.id);
      }
    } catch {
      warnings.push('opponents.json: failed to parse, skipping');
    }
  }
  onProgress?.(65);

  if (opponents && localeOverrides) {
    for (const [, localeData] of localeOverrides.entries()) {
      const oppLocales = (localeData as any).opponents;
      if (oppLocales && typeof oppLocales === 'object') {
        for (const opp of opponents) {
          const entry = oppLocales[String(opp.id)];
          if (entry) {
            if (!opp.name && entry.name) opp.name = entry.name;
            if (!opp.title && entry.title) opp.title = entry.title;
            if (!opp.flavor && entry.flavor) opp.flavor = entry.flavor;
          }
        }
        break;
      }
    }
  }

  // Build TcgParsedCard[] — merge TcgCard with locale overrides or plaintext
  const parsedCards: TcgParsedCard[] = [];
  const hasLocaleFiles = localeOverrides && localeOverrides.size > 0;
  const localeData = hasLocaleFiles ? localeOverrides.get(lang) ?? (localeOverrides.size ? localeOverrides.values().next().value! : {}) : {};

  for (const tc of cards) {
    let name = (hasLocaleFiles && localeData[`card_${tc.id}_name`]) || tc.name || '';
    let description = (hasLocaleFiles && localeData[`card_${tc.id}_desc`]) || tc.description || '';

    // If locale files are present, warn if a card has no name or description
    if (hasLocaleFiles && !name && !description) {
      warnings.push(`Card id ${tc.id}: missing name and description`);
    } else if (hasLocaleFiles && !name) {
      warnings.push(`Card id ${tc.id}: missing name (description provided)`);
    } else if (hasLocaleFiles && !description) {
      warnings.push(`Card id ${tc.id}: missing description (name provided)`);
    }

    parsedCards.push(tcgCardToParsedCard(tc, name, description));
  }
  onProgress?.(75);

  // Load split metadata files from ZIP (races.json, attributes.json, card_types.json, rarities.json)
  const typeMeta: TcgLoadResult['typeMeta'] = {};
  typeMeta.races = await loadMetadataFile(zip, 'races.json', lang, warnings) ?? undefined;
  typeMeta.attributes = await loadMetadataFile(zip, 'attributes.json', lang, warnings) ?? undefined;
  typeMeta.cardTypes = await loadMetadataFile(zip, 'card_types.json', lang, warnings) ?? undefined;
  typeMeta.rarities = await loadMetadataFile(zip, 'rarities.json', lang, warnings) ?? undefined;

  onProgress?.(85);

  // Load campaign.json if present
  let campaignData: TcgCampaignJson | undefined;
  const campaignFile = zip.file('campaign.json');
  if (campaignFile) {
    try {
      campaignData = JSON.parse(await campaignFile.async('string'));
      const campaignWarnings = validateCampaignJson(campaignData!);
      warnings.push(...campaignWarnings);
    } catch {
      warnings.push('campaign.json: failed to parse, skipping');
    }
  }

  // Load fusion_formulas.json if present
  let fusionFormulas: TcgFusionFormula[] | undefined;
  const formulasFile = zip.file('fusion_formulas.json');
  if (formulasFile) {
    try {
      const formulasData = JSON.parse(await formulasFile.async('string'));
      const formulaWarnings = validateFusionFormulasJson(formulasData);
      warnings.push(...formulaWarnings);
      if (formulasData?.formulas && Array.isArray(formulasData.formulas)) {
        fusionFormulas = formulasData.formulas as TcgFusionFormula[];
      }
    } catch {
      warnings.push('fusion_formulas.json: failed to parse, skipping');
    }
  }
  onProgress?.(100);

  return {
    cards,
    parsedCards,
    localeOverrides: localeOverrides ?? new Map(),
    imageGetters,
    meta,
    starterDecks,
    warnings,
    opponents,
    opponentDescriptions,
    typeMeta: (typeMeta.races || typeMeta.attributes || typeMeta.cardTypes || typeMeta.rarities) ? typeMeta : undefined,
    rules,
    shopData,
    rawShopBackgrounds,
    campaignData,
    fusionFormulas,
  };
}
