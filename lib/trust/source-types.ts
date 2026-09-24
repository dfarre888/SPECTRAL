/**
 * Source type of a citation string, by keyword rules.
 *
 * Records cite their sources as free text ("OSINT: Jane's Radar 2024 ...",
 * "Baykar press", a URL). This sorts each citation into a broad type so the
 * Trust page can show where the data comes from. It is a heuristic: rules run
 * in the order below, the first match wins, and anything unmatched is counted
 * as Other. The rules are here in full so a reviewer can check them.
 *
 * Named news outlets are matched before government terms so that "ABC News
 * ... ADF" counts as news; generic words like "news" are matched last so that
 * "Defence news, defence.gov.au" counts as government.
 */

export type SourceTypeId =
  | 'catalogue'
  | 'compilation'
  | 'estimate'
  | 'media'
  | 'official'
  | 'research'
  | 'reference'
  | 'industry'
  | 'other'

export interface SourceTypeRule {
  id: SourceTypeId
  label: string
  match: RegExp
}

const LABEL: Record<SourceTypeId, string> = {
  catalogue: 'Shared RPAS catalogue (A3DM)',
  compilation: 'SPECTRAL analyst compilation',
  estimate: 'Modelled estimate',
  media: 'News and trade press',
  official: 'Government and military',
  research: 'Research and OSINT analysis',
  reference: 'Reference works',
  industry: 'Manufacturer and industry',
  other: 'Other or unattributed',
}

export const SOURCE_TYPE_RULES: readonly SourceTypeRule[] = [
  { id: 'catalogue', label: LABEL.catalogue, match: /A3DM/i },
  {
    id: 'compilation',
    label: LABEL.compilation,
    match: /SPECTRAL_INTEL_UPDATE|SPECTRAL catalogue|SPECTRAL analyst|Training placeholder/i,
  },
  {
    id: 'estimate',
    label: LABEL.estimate,
    match: /Map envelope|family match|SPECTRAL range model|analyst estimate/i,
  },
  {
    id: 'media',
    label: LABEL.media,
    match:
      /Reuters|Associated Press|\bBBC\b|\bCNN\b|Guardian|New York Times|Washington Post|Financial Times|Bloomberg|Al Jazeera|ABC News|\b7NEWS\b|news\.com\.au|Newcastle Herald|Daily Telegraph|\bNOS\b|The Diplomat|Mirage News|sUAS News|MilitaryWatch|USNI News|Breaking Defen[cs]e|Defence Connect|Australian Defence Magazine|\bADM\b|War ?Zone|\bTWZ\b|contactairlandandsea|CONTACT \(|Aviation Week|Flight ?Global|C4ISRNET|Naval News|Kyiv Independent|Times of Israel|Ukrinform|Army Times|Defen[cs]e One|Military Times|Task & Purpose|Popular Mechanics|\bDW\b|France ?24|Nikkei|\bSCMP\b|Yonhap|state media|EW World|Signal Magazine/i,
  },
  // Case-sensitive on purpose: the outlet "Defense News", not a department's "Defence news" page.
  { id: 'media', label: LABEL.media, match: /Defen[cs]e ?News/ },
  {
    id: 'official',
    label: LABEL.official,
    match:
      /\.gov\b|\.gov\.|\.mil\b|\bMoD\b|Ministry|Minister|Pentagon|\bDoD\b|Department of Defen[cs]e|State Department|Air Force|\bArmy\b|\bNavy\b|Marine Corps|\bUSMC\b|\bUSAF\b|\bUSN\b|\bRAN\b|\bRAAF\b|\bADF\b|\bIDF\b|\bIAF\b|\bPLA\b|\bSBU\b|\bHQ\b|Command\b|\bAFSPC\b|CENTCOM|TRADOC|NAVSEA|\bMDA\b|\bIMDO\b|\bNATO\b|UN Panel|United Nations|Government|Senate|Congress|\bHASC\b|\bGAO\b|\bCRS\b|Parliament|Bundestag|\bDSTG?\b|DST Group|\bdstl\b|\bASCA\b|Kirtland|\bJIT\b|National Defen[cs]e Strategy|Defence statement|Defence news/i,
  },
  {
    id: 'research',
    label: LABEL.research,
    match:
      /\bRUSI\b|\bCSIS\b|\bIISS\b|\bASPI\b|\bRAND\b|\bCNA\b|Lowy|Brookings|\bCNAS\b|Carnegie|Missile Defen[cs]e Advocacy|Bellingcat|\bISW\b|Oryx|\bSIPRI\b|Hudson|Heritage Foundation|Chatham|Stimson|War on the Rocks|Jamestown|Iran Watch|JINSA|38 ?North|Nautilus|Arms Control Association|Lincoln Laboratory|Weapons Tracker|imagery analysis|university|journal|conference papers/i,
  },
  {
    id: 'reference',
    label: LABEL.reference,
    match:
      /Jane'?s|Military Balance|Deagel|GlobalSecurity|Army Recognition|Wikipedia|Forecast International|Army Technology|Airforce Technology|Naval Technology|Military ?Factory|Federation of American Scientists|Missile Threat|World Defen[cs]e Almanac|fact sheet|DefenseFeeds/i,
  },
  {
    id: 'industry',
    label: LABEL.industry,
    match:
      /\bpress\b|press release|public releases?|product (brief|page|data|sheet)|brochure|data ?sheet|spec(ification)? sheet|public specs|annual report|manufacturer|Raytheon|\bRTX\b|Lockheed|\bLM\b|Northrop|Boeing|\bBAE\b|Thales|Saab|Rafael|Elbit|\bIAI\b|\bELTA\b|Leonardo|Hensoldt|Rheinmetall|\bKMW\b|Oerlikon|MBDA|Kongsberg|L3Harris|General Atomics|AeroVironment|Anduril|DroneShield|Epirus|Baykar|\bDJI\b|Skydio|Teledyne|Insitu|Textron|Kalashnikov|\bZALA\b|Almaz|Rostec|\bCASC\b|\bCASIC\b|\bAVIC\b|\bCAIG\b|Norinco|Hanwha|\bEOS\b|Leidos|Dedrone|Echodyne|OpenWorks|Blighter|Silentium|\bDEWC\b|SYPAQ|Quantum Systems|Shield AI|\bCEA\b|Ocius|UVision|\bSTM\b|Kronshtadt|Edge Group|NNIIRT|Taurus Systems|BrahMos Aerospace|ASISGUARD|Ziyan|Aerorozvidka|Wild Hornets|Vyriy|Warmate|Parrot|Autel|Airbus|Safran|Diehl|Aselsan|Roketsan|\bTAI\b|\bDRDO\b|Denel/i,
  },
  { id: 'media', label: LABEL.media, match: /\bnews\b|magazine|media|broadcast/i },
]

export function classifySource(citation: string): SourceTypeId {
  for (const r of SOURCE_TYPE_RULES) if (r.match.test(citation)) return r.id
  return 'other'
}

export function sourceTypeLabel(id: SourceTypeId): string {
  return LABEL[id]
}
