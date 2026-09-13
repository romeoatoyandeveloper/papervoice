import { fetch } from 'expo/fetch';

import { env, type Language } from '../config';
import {
  describeTaxonomy,
  DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPES,
  FIELD_KINDS,
  STATUS_LABELS,
  type DocumentType,
  type FieldKind,
  type StatusLabel,
} from '../documentTypes';
import { PipelineError } from './errors';

export interface DocumentField {
  label: string;
  /** Display-ready value, e.g. "€ 125,00", "15 Oct 2026", "+++091/2144/78960+++" */
  value: string;
  kind: FieldKind;
  /** true for a license plate — rendered as a Belgian plate graphic */
  isPlate: boolean;
}

export interface PaymentDetails {
  recipient: string | null;
  iban: string | null;
  bic: string | null;
  paymentReference: string | null;
}

export interface LetterAnalysis {
  isReadableLetter: boolean;
  documentType: DocumentType;
  /** "English / original-language term", e.g. "Road Tax / Verkeersbelasting" */
  documentTitle: string;
  statusLabel: StatusLabel;
  /** Rows for the Document card, in display order */
  fields: DocumentField[];
  /** How to pay, copied exactly as printed; null if there is nothing to pay */
  paymentDetails: PaymentDetails | null;
  spokenScript: string;
  spokenLanguage: string;
}

/** Armenian script block (U+0530–U+058F) */
const hasArmenian = (text: string) => /[\u0530-\u058F]/.test(text);

const nullableString = (description: string) => ({ type: 'STRING', nullable: true, description });

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isReadableLetter: {
      type: 'BOOLEAN',
      description: 'false if the image is not a letter/document, or is too blurry, dark or cropped to read reliably',
    },
    documentType: { type: 'STRING', enum: DOCUMENT_TYPE_IDS },
    documentTitle: {
      type: 'STRING',
      description: 'Armenian transliterated in Latin letters, " / ", then the official term as printed on the letter',
    },
    statusLabel: { type: 'STRING', enum: STATUS_LABELS },
    fields: {
      type: 'ARRAY',
      description: 'Label/value rows for this document type, in display order. Only rows actually found on the letter.',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING', description: 'Short Armenian label transliterated in Latin letters (never Armenian script)' },
          value: { type: 'STRING', description: 'Display-ready value: transliterated Armenian or as printed, Latin letters (never Armenian script)' },
          kind: { type: 'STRING', enum: FIELD_KINDS },
          isPlate: { type: 'BOOLEAN', description: 'true only for a vehicle license plate' },
        },
        required: ['label', 'value', 'kind', 'isPlate'],
        propertyOrdering: ['label', 'value', 'kind', 'isPlate'],
      },
    },
    paymentDetails: {
      type: 'OBJECT',
      nullable: true,
      description: 'Payment instructions from the letter. null if there is nothing to pay.',
      properties: {
        recipient: nullableString('Name of the account holder / organisation to pay, as printed'),
        iban: nullableString('Bank account number (IBAN) exactly as printed'),
        bic: nullableString('BIC/SWIFT code exactly as printed'),
        paymentReference: nullableString(
          'Structured communication (+++xxx/xxxx/xxxxx+++) or other payment reference, exactly as printed',
        ),
      },
      required: ['recipient', 'iban', 'bic', 'paymentReference'],
      propertyOrdering: ['recipient', 'iban', 'bic', 'paymentReference'],
    },
    spokenScript: {
      type: 'STRING',
      description: 'The casual spoken explanation, in the target language',
    },
    spokenLanguage: {
      type: 'STRING',
      description: 'ISO 639-1 code of the language spokenScript is written in',
    },
  },
  required: [
    'isReadableLetter',
    'documentType',
    'documentTitle',
    'statusLabel',
    'fields',
    'paymentDetails',
    'spokenScript',
    'spokenLanguage',
  ],
  propertyOrdering: [
    'isReadableLetter',
    'documentType',
    'documentTitle',
    'statusLabel',
    'fields',
    'paymentDetails',
    'spokenScript',
    'spokenLanguage',
  ],
};

function buildPrompt(language: Language) {
  return `You're the reader's mate who happens to be great with paperwork. They just sent you an official letter — most likely Belgian (Dutch, French or German) — and they have no idea what it says. It can be one or more photos (e.g. the front and back of the same letter) and/or a PDF: treat everything attached as pages of ONE letter, read all of it and combine the information (don't describe the pages separately). Figure it out and tell them like you're chatting over coffee.

STEP 1 — Classify the letter into one "documentType":
${describeTaxonomy()}

STEP 2 — Fill the Document card. IMPORTANT: the card is written in Armenian but with Latin (English) letters — the way Armenians text each other ("Armenglish"), e.g. "Pox", "Minchev erb", "Mekenayi hark", "Petk a mucvi", "Prcnum a". Never use Armenian script (no Ա-Ֆ/ա-ֆ characters) anywhere on the card, and don't write English words.
- Spelling (texting style): c for ց/ծ, x for խ/ղ, ch for չ/ճ, sh for շ, zh for ժ, u for ու, e for ե, k for ք — e.g. "mucvi", "prcnum", "pox", "vortex".
- Keep it colloquial, not bookish or official: spoken "a" instead of "e" for "is" ("petk a", "prcnum a", "chka"), short everyday words ("minchev erb" not "verjnazhamket", "pox" not "vcharman gumar", "mucvi" not "vcharel", "gine" not "arzheq", "inchi hamar" not "patchar").
- "documentTitle": transliterated Armenian name + " / " + the official term exactly as printed on the letter (see examples above).
- "statusLabel": pick the enum value that fits (usually the type's default; use "Action Required" or "For Your Information" if that's more accurate). The app shows it in Armenian itself.
- "fields": use the listed fields for that type, in that order, with exactly those labels. Leave out any field the letter doesn't actually have. You may add up to 2 extra rows if something else is really important (e.g. an appeal deadline) — same transliterated style for their labels. For "other", pick the 3–6 rows that matter most.
- Values must be display-ready and short:
  - amounts like "€ 125,00"; times like "09:00"
  - dates with transliterated Armenian months: "15 hoktemberi 2026" (hunvari, petrvari, marti, aprili, mayisi, hunisi, hulisi, ogostosi, septemberi, hoktemberi, noyemberi, dektemberi)
  - descriptions and rules in transliterated Armenian too, e.g. "30 orva mej", "Sxal tex kangnel — Rue de la Loi"
  - names, street addresses, organisation names and official terms stay exactly as printed
- License plates: kind "plate", "isPlate": true, value exactly as printed (e.g. "1-ABC-123"). Every other row: "isPlate": false.
- References, account numbers and plates must be copied character-for-character. Never guess a digit.

STEP 3 — "paymentDetails": recipient, IBAN, BIC and payment reference exactly as printed, null for anything not on the letter. Set the whole object to null if there's nothing to pay.

STEP 4 — "spokenScript", written in ${language.promptName}. A voice will read this out loud, so it has to sound like a real friend talking, not a letter, not a bank, not a government office, not a customer-service bot.
- Super casual and warm. ${language.casualAddress}
- Talk the way people actually talk: short sentences, everyday words, contractions, a natural opener ("Okay, so this one's from the city…", "Alright, good news…"). A bit of reassurance or a light touch of humour is great when it fits ("don't worry, it's an easy one").
- Zero stiff or official language: no "hereby", "you are required to", "please note", "kindly", "in accordance with", no long formal sentences. Say "you gotta pay 125 euros by October 15th", not "payment of the amount is required before the due date".
- Order: what it is and who it's from → what they need to do → how much and by when → how to pay or respond ("just use the reference code on screen") → anything that happens if they ignore it.
- Don't read out account numbers, plates or reference codes — they're on screen.
- No markdown, lists, emoji, headings or stage directions — only spoken sentences.
- Say dates and amounts the way people naturally say them in ${language.label}.
- Around 60–110 words.
- Casual, but 100% accurate: never skip or soften amounts, deadlines or consequences.

"spokenLanguage": "${language.iso}".

If the attachments aren't a letter or you can't read them reliably: "isReadableLetter": false, "documentType": "other", "statusLabel": "For Your Information", empty "fields", null "paymentDetails", and a short, friendly one-liner in ${language.promptName} asking them to snap it again.

Never invent anything that isn't on the letter.`;
}

export async function analyzeLetter(
  /** All pages of one letter, in order: photos (front, back, …) and/or PDFs */
  files: { base64: string; mimeType: string }[],
  language: Language,
  signal?: AbortSignal,
): Promise<LetterAnalysis> {
  if (!env.geminiApiKey) {
    throw new PipelineError(
      'missing-key',
      'PaperVoice isn’t set up yet — add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.',
    );
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`,
    {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              ...files.map((f) => ({ inline_data: { mime_type: f.mimeType, data: f.base64 } })),
              { text: buildPrompt(language) },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (__DEV__) console.warn(`Gemini ${res.status}:`, body);
    if (res.status === 400 && /API key/i.test(body)) {
      throw new PipelineError('missing-key', 'Your Gemini API key was rejected — check your .env file.', body);
    }
    if (res.status === 401 || res.status === 403) {
      throw new PipelineError('missing-key', 'Your Gemini API key was rejected — check your .env file.', body);
    }
    if (res.status === 429 || res.status >= 500) {
      throw new PipelineError('service', 'The reading service is busy right now — try again in a moment.', body);
    }
    throw new PipelineError('service', "Couldn't read that clearly — try again.", body);
  }

  const json = await res.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts
    ?.filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? '')
    .join('');

  let parsed: LetterAnalysis;
  try {
    parsed = JSON.parse(text ?? '');
  } catch (e) {
    throw new PipelineError('unreadable', "Couldn't read that clearly — try again.", { e, json });
  }

  if (!DOCUMENT_TYPE_IDS.includes(parsed.documentType)) parsed.documentType = 'other';
  if (!STATUS_LABELS.includes(parsed.statusLabel)) {
    parsed.statusLabel = DOCUMENT_TYPES[parsed.documentType].status;
  }
  // The card uses Latin letters only: if Gemini slipped into Armenian script,
  // fall back to the type's own transliterated labels/title.
  const spec = DOCUMENT_TYPES[parsed.documentType];
  const usedTemplates = new Set<number>();
  if (!parsed.documentTitle?.trim() || hasArmenian(parsed.documentTitle)) {
    parsed.documentTitle = spec.exampleTitle.split(' / ')[0];
  }
  parsed.fields = (Array.isArray(parsed.fields) ? parsed.fields : [])
    .filter((f) => f?.label?.trim() && f?.value?.trim())
    .map((f) => {
      const isPlate = f.isPlate === true || f.kind === 'plate';
      const kind: FieldKind = isPlate ? 'plate' : FIELD_KINDS.includes(f.kind) ? f.kind : 'text';
      let label = f.label.trim();
      if (hasArmenian(label)) {
        const i = spec.fields.findIndex((t, idx) => t.kind === kind && !usedTemplates.has(idx));
        if (i === -1) return null;
        usedTemplates.add(i);
        label = spec.fields[i].label;
      }
      return { label, value: f.value.trim(), kind, isPlate };
    })
    .filter((f): f is DocumentField => f !== null && !hasArmenian(f.value));
  const pay = parsed.paymentDetails;
  if (!pay || !(pay.recipient || pay.iban || pay.bic || pay.paymentReference)) {
    parsed.paymentDetails = null;
  }

  if (!parsed.isReadableLetter || !parsed.spokenScript?.trim()) {
    throw new PipelineError(
      'unreadable',
      "Couldn't read that clearly — try again with the whole letter in the frame and good light.",
      parsed,
    );
  }
  return parsed;
}
