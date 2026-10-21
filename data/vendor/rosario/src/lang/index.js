const LANG_LOADERS = {
  en: () => import('./en.js'),
  la: () => import('./la.js'),
  it: () => import('./it.js'),
  es: () => import('./es.js'),
  pt: () => import('./pt.js'),
  fr: () => import('./fr.js'),
  de: () => import('./de.js'),
  ar: () => import('./ar.js'),
  tl: () => import('./tl.js'),
  id: () => import('./id.js'),
  vi: () => import('./vi.js'),
  fi: () => import('./fi.js'),
  lt: () => import('./lt.js'),
}

export async function loadLang (code) {
  const loader = LANG_LOADERS[code]

  if (!loader) {
    throw new Error(`Unsupported language: ${code}`)
  }

  const module = await loader()
  return module.default
}
