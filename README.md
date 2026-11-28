# Krivi Quattro

Aplikacija pikado kluba Krivi Quattro. Nakon prijave vidi se naslovnica (sljedeća utakmica, poredak, igrači), lige PSGZ-a, statistika, momčad, raspored, rezultati i trening (dolasci i igre 501, cricket, maraton, high score).

Sučelje je na hrvatskom. Logo se mijenja tako da se zamijeni datoteka `public/logo.jpg` (i ikone u `public/icons/` ako želiš novu ikonu na telefonu).

## Zašto je Vercel vraćao 404

U repozitoriju je bila samo arhiva `krivi-quattro-vercel-fixed.tar.gz`. Na korijenu nije bilo `package.json` ni Next.js aplikacije, pa Vercel nije imao nijednu stranicu.

Aplikacija sada stoji u korijenu repozitorija. U Vercel projektu **krivi-quattro2** provjeri:

- **Root Directory:** prazno (korijen repozitorija). Ne smije biti `krivi-quattro`.
- **Framework Preset:** Next.js. Isključi Override ako piše Other.
- **Build Command:** `npm run build`, bez uključenog Overridea.
- **Output Directory:** prazno, Override isključen. Nemoj upisivati `public`, `out` ni `.next`.
- **Install Command:** `npm install`

Ako `https://krivi-quattro2.vercel.app/logo.jpg` radi, a `/login` i dalje vraća Vercelov `NOT_FOUND`, projekt je i dalje objavljen kao obične datoteke iz `public/`. Tada u Settings → Build and Deployment → Framework Settings postavi preset na Next.js i isključi Override na Output Directory, pa Redeploy.

Nema statičkog izvoza (`output: 'export'`). Trebaju serverske rute.

## Računi

Svaki član ima svoj račun (e-mail i lozinka). Lozinka se sprema samo kao hash (scrypt na poslužitelju, PBKDF2 u lokalnom načinu). Prvi registrirani račun postaje admin. Admin može drugom članu dati ili skinuti admin ulogu u izborniku Više.

Ako želiš da određeni e-mail uvijek bude admin, u Vercelu dodaj:

- `ADMIN_EMAIL` = e-mail Filipa, npr. `filipgranc30@gmail.com`

Preporučeno i:

- `SESSION_SECRET` = dugačak slučajan niz (barem 32 znaka)

## Dijeljeni podaci između telefona

Bez baze svaki telefon drži račune i dolaske samo kod sebe (localStorage) i na vrhu se vidi upozorenje.

Da bi ekipa vidjela iste račune, raspored, dolaske, igre i obavijesti, u Vercelu poveži **Upstash Redis** (Storage → Create → Redis). Vercel sam upisuje:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Isto rade i ova imena, ako baza nije iz Vercel sučelja:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Nakon spremanja varijabli ponovno deployaj. Aplikacija se i dalje gradi i otvara i kad varijable nisu postavljene.

## Obavijesti

U aplikaciji postoji zvonce i popis. Ekipa dobije obavijest kad netko označi **Dolazim** na utakmicu ili trening, i kad admin doda ili promijeni termin.

Web push (obavijest i kad je aplikacija zatvorena) radi tek kad u Vercel dodaš VAPID ključeve. Na svom računalu:

```bash
npx web-push generate-vapid-keys
```

U Vercel upiši:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` = `mailto:filipgranc30@gmail.com`

Bez tih varijabli push gumb kaže da nije podešen. Ostatak aplikacije radi.

## Podaci s psgz.hr

Automatski, s predmemorijom od oko 6 sati:

| Što | Odakle |
| --- | --- |
| Popis liga | [psgz.hr/competitions](https://psgz.hr/competitions) (sezona 2026/27) |
| Tablica, raspored, igrači | `https://psgz.hr/site/uniondivision/UnionLeagueTable?unionId=2&seasonId=26&leagueId=<id>` |
| Naša liga | [ranking-table/818](https://psgz.hr/ranking-table/818) — 3. liga skupina B |
| Adresa sljedećeg susreta | stranica ekipe, npr. `/hps/krivi-quattro` |

Stari link [ranking-table/295](https://psgz.hr/ranking-table/295) je sezona 25 (2025/26), iako naslov na toj stranici zna pisati 2026/27. Naslovnica zato koristi ligu **818**.

Na dan izrade sljedeći neodigrani susret bio je 13. kolo, 1.12.2026. u 19:00, Krivi Quattro doma protiv X. Krivi Quattro su bili 10. s 12 bodova. To se samo osvježava.

Ručno (admin, Više i Raspored) može se upisati poredak, prisilna sljedeća utakmica, dodatni termin i sastav protivnika. Ručni poredak i prisilna utakmica imaju prednost nad PSGZ-om dok ih admin ne makne. Ako PSGZ ne odgovori, naslovnica pokaže jasno označene demo podatke iz skice (Bull Buzin).

Stupac **Bod** na PSGZ-u je njihov bodovni prosjek, uz postotak pobjeda. To nije prosjek tri strelice s ploče. Trening bilježi pravi prosjek tri strelice iz odigranih igara.

## Android

**PWA:** Chrome → izbornik → Instaliraj aplikaciju / Dodaj na početni zaslon.

**APK:** workflow `.github/workflows/android-apk.yml` (Capacitor WebView prema `https://krivi-quattro2.vercel.app`). Potpis koristi GitHub tajne `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD` i `ANDROID_KEY_ALIAS`. Ključ nije u repozitoriju. Bez tih tajni job i dalje složi nepotpisanu datoteku. Potpisani artefakt `krivi-quattro-apk` se šalje s `main` i s ručnog pokretanja. To nije trgovina Play, nego datoteka za ručnu instalaciju. Telefon mora dozvoliti instalaciju iz nepoznatih izvora.

## Lokalno

```bash
npm install
npm run dev
```

Produkcijska provjera: `npm run build` pa `npm start`.
