# casus-landing

Landing casus.md: zapis na listę oczekujących przed premierą. Statyczne HTML, CSS i JS bez
zależności i bez kroku budowania.

Podgląd projektu: https://scencyk.github.io/casus-landing/ (formularz nic nie zapisuje).

## Pliki

| Plik | Co to |
| --- | --- |
| `index.html` | Strona: hero, trzy funkcje, panel zapisu |
| `style.css` | Style, kolory marki jako zmienne w `:root` |
| `main.js` | Teksty PL/EN, wzór z kafli Truchet–Smith w tle, formularz |
| `assets/` | Sygnet i wordmark z Figmy „Naming” (węzeł `113:264`), favicon |
| `fonts/` | Geist i Geist Mono (SIL OFL 1.1, `fonts/OFL.txt`) |

## Jak działa na produkcji

Strona zakłada routing z `client/nginx.conf` w rmd-ai-demo:

- anonimowe `/` dostaje `index.html`, a wszystkie zasoby są pod `/_l/` (`/_l/style.css`,
  `/_l/main.js`, `/_l/assets/…`, `/_l/fonts/…`);
- formularz wysyła `POST /api/waitlist` z `{ "email": "...", "lang": "pl" | "en" }`:
  `201` nowy adres, `200` znany adres (to samo body `{ ok: true }`), `400` błędny e-mail,
  `429` limit zapytań; każdy inny błąd pokazuje komunikat ogólny;
- język wybrany przyciskiem EN/PL zostaje w `localStorage` pod kluczem `casus_lang`;
- „Zaloguj” prowadzi do `/login`.

W kontenerze wystarczy serwować te pliki pod `/` i `/_l/`. Jeśli landing ma przejść przez Vite,
ustaw `base: '/_l/'`, a ścieżki zostaw bez zmian.

## Lokalnie

```bash
node scripts/serve.mjs
```

Strona: http://localhost:3300. Serwer mapuje `/_l/` jak nginx i odpowiada `201` na
`POST /api/waitlist`.

## Podgląd na GitHub Pages

```bash
bash scripts/deploy.sh
```

Skrypt kopiuje pliki do `out/`, zamienia ścieżki `/_l/` na względne, dodaje
`<html data-preview>` (formularz pokazuje podziękowanie bez wysyłki, pod formularzem jest
dopisek „Podgląd projektu”) i wypycha `out/` na gałąź `gh-pages`. Pliki w repo zostają
w wersji produkcyjnej.

## Szczegóły

- Wzór w tle jest deterministyczny (ziarno `casus`). Fala światła i reflektor przy kursorze
  przesuwają się tylko przez `transform`. Kafel pod kursorem myszy obraca się o 90°, a na
  dotyku wzór nie reaguje.
- Przy „ogranicz ruch” znikają fala, obroty i pulsowanie kropki; przejścia przezroczystości
  zostają.
- W wersji polskiej jednoliterowe słowa (a, i, o, u, w, z) są sklejane z następnym twardą
  spacją, żeby nie zostawały na końcu linii.
