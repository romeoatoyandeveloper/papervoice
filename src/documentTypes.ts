// Letter taxonomy (Belgian government/administrative letters), shared by the
// Gemini prompt and the Result screen's Document card.

export type DocumentType =
  | 'municipal_tax'
  | 'fine'
  | 'parking_fine'
  | 'speeding_fine'
  | 'tax_refund'
  | 'jury_duty'
  | 'permit_renewal'
  | 'car_tax'
  | 'car_insurance'
  | 'other';

/** Drives how a value is styled in the Document card. */
export type FieldKind = 'amount' | 'refund_amount' | 'deadline' | 'date' | 'plate' | 'reference' | 'text';

export type StatusLabel =
  | 'Payment Required'
  | 'Fine'
  | 'Refund'
  | 'Action Required'
  | 'Renewal Due'
  | 'For Your Information';

export type TagTone = 'accent' | 'accent2' | 'neutral';

interface FieldTemplate {
  label: string;
  kind: FieldKind;
  hint: string;
}

interface DocumentTypeSpec {
  description: string;
  status: StatusLabel;
  /** Example title: Armenian in Latin letters + " / " + the term on the letter */
  exampleTitle: string;
  fields: FieldTemplate[];
}

export const DOCUMENT_TYPES: Record<DocumentType, DocumentTypeSpec> = {
  municipal_tax: {
    description: 'Municipal/commune tax bill (gemeentebelasting, taxe communale), or a similar tax assessment you have to pay',
    status: 'Payment Required',
    exampleTitle: 'Hamaynkayin hark / Gemeentebelasting',
    fields: [
      { label: 'Pox', kind: 'amount', hint: 'total to pay' },
      { label: 'Vcharman kod', kind: 'reference', hint: 'structured communication like +++091/2144/78960+++' },
      { label: 'Minchev erb', kind: 'deadline', hint: 'pay-by date' },
    ],
  },
  fine: {
    description: 'Other fines, e.g. GAS fine (GAS-boete, amende SAC) for litter, noise, etc. — NOT parking or speeding (those have their own types)',
    status: 'Fine',
    exampleTitle: 'Tugank / GAS-boete',
    fields: [
      { label: 'Tugani pox', kind: 'amount', hint: 'fine amount' },
      { label: 'Inchi hamar', kind: 'text', hint: 'what the fine is for, short, e.g. "Axb nety tex" or "Axmuk gisherov"' },
      { label: 'Minchev erb', kind: 'deadline', hint: 'pay-by date, or the rule, e.g. "30 orva mej"' },
    ],
  },
  parking_fine: {
    description: 'Parking ticket or parking charge (parkeerretributie, parkeerboete, redevance de stationnement), incl. letters from parking agencies',
    status: 'Fine',
    exampleTitle: 'Parkingi tugank / Parkeerretributie',
    fields: [
      { label: 'Hamaranish', kind: 'plate', hint: 'plate exactly as printed' },
      { label: 'Pox', kind: 'amount', hint: 'amount to pay' },
      { label: 'Vortex', kind: 'text', hint: 'street/place where the car was parked, as printed' },
      { label: 'Erb', kind: 'date', hint: 'date and time of the parking, e.g. "3 septemberi 2026, 14:25"' },
      { label: 'Minchev erb', kind: 'deadline', hint: 'pay-by date' },
    ],
  },
  speeding_fine: {
    description: 'Speed camera / traffic fine (flitsboete, onmiddellijke inning, minnelijke schikking, perception immédiate), incl. red-light camera',
    status: 'Fine',
    exampleTitle: 'Kamerayi tugank / Flitsboete',
    fields: [
      { label: 'Hamaranish', kind: 'plate', hint: 'plate exactly as printed' },
      { label: 'Pox', kind: 'amount', hint: 'amount to pay' },
      { label: 'Aragutyun', kind: 'text', hint: 'measured speed vs limit, e.g. "67 km/h (50-i tex)"; for red light: "Karmiri vra"' },
      { label: 'Vortex', kind: 'text', hint: 'road/place of the offence, as printed' },
      { label: 'Erb', kind: 'date', hint: 'date and time of the offence, e.g. "3 septemberi 2026, 14:25"' },
      { label: 'Minchev erb', kind: 'deadline', hint: 'pay-by date' },
    ],
  },
  tax_refund: {
    description: 'Tax assessment where the reader gets money back (e.g. aanslagbiljet personenbelasting with a refund)',
    status: 'Refund',
    exampleTitle: 'Harki veradardz / Aanslagbiljet Personenbelasting',
    fields: [
      { label: 'Het kstanas', kind: 'refund_amount', hint: 'amount they get back' },
      { label: 'Erb kga', kind: 'text', hint: 'when the money arrives, e.g. "6 shabatva mej"' },
      { label: 'Hamar', kind: 'reference', hint: 'assessment number' },
    ],
  },
  jury_duty: {
    description: 'Jury duty summons (oproeping juryplicht, convocation jury d’assises)',
    status: 'Action Required',
    exampleTitle: 'Jury-i kanch / Oproeping tot Juryplicht',
    fields: [
      { label: 'Or u zham', kind: 'date', hint: 'when to appear, e.g. "12 noyemberi 2026, 09:00"' },
      { label: 'Vortex', kind: 'text', hint: 'where to go' },
      { label: 'Pataxani minchev', kind: 'deadline', hint: 'reply deadline' },
    ],
  },
  permit_renewal: {
    description: 'Renewal of a residence permit, ID card, driving licence or other permit',
    status: 'Renewal Due',
    exampleTitle: 'Karti erkarum / Verlenging Verblijfsvergunning',
    fields: [
      { label: 'Prcnum a', kind: 'date', hint: 'when the current one expires' },
      { label: 'Erkari minchev', kind: 'deadline', hint: 'renewal deadline' },
      { label: 'Vortex', kind: 'text', hint: 'where to go, e.g. "Hamaynkapetaran"' },
    ],
  },
  car_tax: {
    description: 'Road tax / vehicle tax (verkeersbelasting, taxe de circulation)',
    status: 'Payment Required',
    exampleTitle: 'Mekenayi hark / Verkeersbelasting',
    fields: [
      { label: 'Hamaranish', kind: 'plate', hint: 'plate exactly as printed, e.g. "1-ABC-123"' },
      { label: 'Pox', kind: 'amount', hint: 'total to pay' },
      { label: 'Minchev erb', kind: 'deadline', hint: 'pay-by date' },
    ],
  },
  car_insurance: {
    description: 'Car/motor insurance renewal or premium notice',
    status: 'Renewal Due',
    exampleTitle: 'Mekenayi straxovka / Verzekering Voertuig',
    fields: [
      { label: 'Hamaranish', kind: 'plate', hint: 'plate exactly as printed' },
      { label: 'Pox', kind: 'amount', hint: 'premium to pay' },
      { label: 'Erkari minchev', kind: 'deadline', hint: 'renewal/pay-by date' },
    ],
  },
  other: {
    description: 'Anything else (utility bills, social security, bank or school letters, …)',
    status: 'For Your Information',
    exampleTitle: 'Luysi hashiv / Energiefactuur',
    fields: [],
  },
};

export const DOCUMENT_TYPE_IDS = Object.keys(DOCUMENT_TYPES) as DocumentType[];

export const STATUS_LABELS: StatusLabel[] = [
  'Payment Required',
  'Fine',
  'Refund',
  'Action Required',
  'Renewal Due',
  'For Your Information',
];

/** What the status tag shows — Armenian written in Latin letters. */
export const STATUS_DISPLAY: Record<StatusLabel, string> = {
  'Payment Required': 'Petk a mucvi',
  Fine: 'Tugank',
  Refund: 'Veradardz',
  'Action Required': 'Petk a pataxanel',
  'Renewal Due': 'Petk a erkarel',
  'For Your Information': 'Uxaki imanas',
};

export const FIELD_KINDS: FieldKind[] = ['amount', 'refund_amount', 'deadline', 'date', 'plate', 'reference', 'text'];

/** Tag color per status, matching the handoff's `.tag-accent` / `.tag-accent-2` / `.tag-neutral`. */
export const STATUS_TONE: Record<StatusLabel, TagTone> = {
  'Payment Required': 'accent',
  Fine: 'accent',
  Refund: 'accent2',
  'Action Required': 'accent2',
  'Renewal Due': 'neutral',
  'For Your Information': 'neutral',
};

/** Human-readable taxonomy for the prompt. */
export function describeTaxonomy() {
  return DOCUMENT_TYPE_IDS.map((id) => {
    const t = DOCUMENT_TYPES[id];
    const fields = t.fields.length
      ? t.fields.map((f) => `"${f.label}" (kind: ${f.kind}; ${f.hint})`).join(', ')
      : 'free-form: the 3–6 label/value pairs that matter most (kind: amount/deadline/date/reference/text as fits)';
    return `- ${id}: ${t.description}. Usual statusLabel: "${t.status}". Title like "${t.exampleTitle}". Fields: ${fields}.`;
  }).join('\n');
}
