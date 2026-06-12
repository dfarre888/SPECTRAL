const COUNTRY_FLAGS: Record<string, string> = {
  'United States': '🇺🇸',
  'Ukraine': '🇺🇦',
  'Russia': '🇷🇺',
  'Iran': '🇮🇷',
  'Turkey': '🇹🇷',
  'Israel': '🇮🇱',
  'Australia': '🇦🇺',
  'United Kingdom': '🇬🇧',
  'China': '🇨🇳',
  'Poland': '🇵🇱',
  'Italy': '🇮🇹',
  'Multi-nation': '🌐',
  'Spain': '🇪🇸',
  'Pakistan': '🇵🇰',
  'Saudi Arabia': '🇸🇦',
  'Egypt': '🇪🇬',
  'UAE': '🇦🇪',
  'Iraq': '🇮🇶',
  'Jordan': '🇯🇴',
}

export function countryFlag(country: string | null | undefined): string {
  if (!country) return '🏳️'
  return COUNTRY_FLAGS[country] ?? '🏳️'
}
