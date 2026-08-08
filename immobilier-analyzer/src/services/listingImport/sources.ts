/** Plateformes immobilières connues, pour nommer proprement la source. */
export const KNOWN_SOURCES: Record<string, string> = {
  'leboncoin.fr': 'Leboncoin',
  'seloger.com': 'SeLoger',
  'bienici.com': "Bien'ici",
  'pap.fr': 'PAP',
  'logic-immo.com': 'Logic-Immo',
  'figaroimmo.fr': 'Figaro Immo',
  'orpi.com': 'Orpi',
  'century21.fr': 'Century 21',
  'laforet.com': 'Laforêt',
  'guy-hoquet.com': 'Guy Hoquet',
  'iadfrance.fr': 'iad France',
  'safti.fr': 'SAFTI',
  'nexity.fr': 'Nexity',
}

/** Déduit un nom de source lisible depuis une URL (nom de domaine sinon). */
export function sourceNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    for (const [domain, name] of Object.entries(KNOWN_SOURCES)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) return name
    }
    return hostname
  } catch {
    return 'URL'
  }
}
