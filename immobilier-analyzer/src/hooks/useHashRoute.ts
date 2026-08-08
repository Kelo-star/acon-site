/**
 * Mini-routeur basé sur le hash (#/...), pour éviter une dépendance de
 * routing et fonctionner tel quel sur n'importe quel hébergement statique.
 *
 * Routes :
 *   #/                     tableau de bord
 *   #/new                  création (choix, formulaire, import d'annonce)
 *   #/property/:id         fiche d'un bien (?tab=resume|visite|…)
 *   #/property/:id/report  rapport imprimable
 *   #/compare?ids=a,b      comparateur
 */
import { useCallback, useEffect, useState } from 'react'

export interface Route {
  path: string[]
  params: URLSearchParams
}

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '')
  const [pathPart, queryPart] = hash.split('?')
  const path = pathPart.split('/').filter(Boolean)
  return { path, params: new URLSearchParams(queryPart ?? '') }
}

export function navigate(to: string): void {
  window.location.hash = to.startsWith('#') ? to : `#${to}`
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash())

  const onChange = useCallback(() => setRoute(parseHash()), [])

  useEffect(() => {
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [onChange])

  return route
}
