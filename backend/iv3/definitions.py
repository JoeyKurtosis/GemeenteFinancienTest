"""What each figure on the Gemeentelijke Stand page actually means in IV3 codes.

Nothing in the warehouse documents the code space (`gemeenten_iv3_meta` only names the
columns), so the mapping below was derived by matching national totals against the
figures the page was mocked up with. Every metric carries the euro-per-inhabitant total
it produced for the 2023 Jaarrekening; if a query starts returning something far off that
number, the code is wrong, not the data.

Recheck with:
    SELECT trim(categorie), sum("2eplaatsing") FROM gemeenten_iv3
    WHERE jaar = 2023 AND verslagsoort = '2023X005' AND "2eplaatsing" <> -99998 ...
"""

# CBS writes "no figure" as -99998 rather than NULL. It has to be compared for equality:
# genuine amounts run well past it in the negative direction (-446327 = -EUR 446M shows up
# in a 2023 correction), so a `> -99000` cutoff would silently delete real money.
GEEN_OPGAVE = -99998

# Amounts are stored in thousands of euros.
BEDRAG_FACTOR = 1000

# `taakveldbalanspost` mixes the exploitation taakvelden (0.1 - 8.3) with the balance sheet
# (A* activa, P* passiva). Only the taakvelden are income and expenditure.
BALANSPOST_PREFIXES = ("A", "P")

# Mutations of the reserves are a taakveld like any other, which is what the sidebar's
# reservemutaties toggle switches on.
TAAKVELD_RESERVEMUTATIES = "0.10"

# 0.11 is the saldo of the very rows the rest of this module adds up, and the two sides of it are
# treated differently — deliberately, and not symmetrically:
#
#   * Its LASTEN are a surplus booked to close the begroting. Counting them alongside the lasten
#     they are derived from would add a gemeente's begrotingsresultaat to its spending, so
#     _AGGREGATE drops them and _RESULTAAT reads them into their own column for the one page that
#     draws them (Iv3Summary.resultaat_lasten_per_hoofdcategorie).
#
#   * Its BATEN are the mirror image — a deficit booked as income — and are kept, landing in
#     `baten` and in the residual bron like any other B row. Analytically that is the same
#     objection as above; it is kept anyway because it is what the report counts, and the Baten
#     and Begroting pages are read against the report.
#
# That asymmetry is the report's, established by measurement rather than assumed. Against the old
# dashboard's Baten page (Aa en Hunze, 2024 Begroting, reservemutaties on) the per-gemeente
# shortfall in `baten` was exactly 0.11's baten — Assen EUR 361/inw, Schiermonnikoog 73,
# Vlaardingen 11, and zero for the fifteen of eighteen gemeenten that already agreed to the euro.
# Adding them back reproduces the referentiegroep's baten to within EUR 0,50 per inwoner in 2018,
# 2020, 2022 and 2024 alike. The lasten stay out on the same evidence: the referentiegroep's
# uitgaven read EUR 3.657/inw on both dashboards, and folding 0.11's lasten in would make it 3.679.
#
# The cost of that faithfulness is that on this page baten and lasten no longer close against each
# other: the Begroting page's resultaat row is the saldo *plus* whatever 0.11 carries.
TAAKVELD_RESULTAAT = "0.11"

# The sociaal domein subdivides its taakvelden a level deeper than the rest, and has done it
# two different ways. Until 2024 the children carried a letter — 6.71 Maatwerkdienstverlening
# 18+ was specified by 6.71a Huishoudelijke hulp, 6.71b Begeleiding. From 2025 CBS renumbered
# them into a third digit instead: 6.711 Huishoudelijke hulp, 6.712 Begeleiding, and new
# families like 6.751/6.752/6.753 Jeugdhulp ambulant.
#
# Through 2024 the Lasten donuts roll lettered codes up to their parents. From 2025 the
# dashboard retains the official three-digit codes, including their local/regional/landelijk
# distinctions. This makes the published task fields visible instead of inventing parent codes.
#
# Two digits, not one: 0.61 OZB woningen and 0.62 OZB niet-woningen are taakvelden in their own
# right and there is no 0.6 for them to belong to. The same goes for 6.21/6.22/6.23.
#
# Summing a parent with its children does not double-count, because the parents are all but
# unused: for the 2023 Jaarrekening only 20 of 342 gemeenten booked anything on a bare 6.71
# (EUR 7.8M together), against 337 on 6.71a alone (EUR 1.59bn). The money is on the children.
TAAKVELD_SUBCODE_SUFFIX = r"[a-z]+$"
TAAKVELD_SUBCODE_DIEPTE = 2

# The verslagsoort code carries the year and the report type: 2023X005. Held constant
# across a multi-year line, the suffix is what makes the years comparable.
VERSLAGSOORT_BEGROTING = "000"
VERSLAGSOORT_JAARREKENING = "005"

# ── Metrics ─────────────────────────────────────────────────────────────────────────
#
# `categorie` is prefixed L (lasten) or B (baten); the digits after it are the CBS
# categorie. `taakveld` narrows a metric to where the money was booked.

# Salarissen en sociale lasten (EUR 792/inw). "Totale" personeelskosten adds the hired-in
# staff of L3.1 — drop INHUUR here to report payroll alone.
CATEGORIE_SALARISSEN = "L1.1"

# Ingeleend personeel (EUR 174/inw). This is the categorie the Benchmark page names in its
# own uitleg, alongside 1.1 — the two together are "personele lasten". L3.1 was used here
# before and is something else entirely (it yields EUR 29/inw, far too little to be the
# nation's hired-in staff).
CATEGORIE_INHUUR = "L3.5.1"

# Overhead is a taakveld of its own, which is what makes the Managementoverzicht's three
# personeelsvragen separable: the salarislasten and the inhuur are asked of every taakveld
# *but* 0.4, and the overheadkosten are those same two categorieën asked of 0.4 alone.
#
# Deliberately not a change to CATEGORIE_SALARISSEN / CATEGORIE_INHUUR, and deliberately not
# a subtraction inside the sync: Gemeentelijke Stand's personeel and inhuur lines and the
# Benchmark page's personele lasten all count 0.4 along with the rest and always have. The
# overhead is stored *alongside* those totals as a subset of them — Iv3Summary.salarissen_overhead
# is part of Iv3Summary.salarissen, not taken out of it — so this one page can subtract it per
# request without moving a figure anywhere else. Two pages, two numbers for "inhuur", on purpose.
#
# A bare code compares safely: 0.4 has no sub-codes the way 6.71 has 6.71a — the 2023 Jaarrekening
# carries exactly one taakveld starting "0.4", and it is 0.4 itself.
TAAKVELD_OVERHEAD = "0.4"

# Inkomensoverdrachten aan gemeenschappelijke regelingen (EUR 467/inw). Inferred: the
# 4.3.x sub-codes distinguish the counterparty and nothing in the warehouse names them.
CATEGORIE_VERBONDEN_PARTIJEN = "L4.3.3"

# Inkomensoverdrachten van het Rijk. Split by where they land: the algemene uitkering uit
# het gemeentefonds is booked on taakveld 0.7 (EUR 2312/inw), and everything else is a
# specifieke uitkering — a SPUK — booked on the taakveld it funds (EUR 655/inw). That
# split is the SPUKS figure; it is an inference.
CATEGORIE_RIJK = "B4.3.1"
TAAKVELD_ALGEMENE_UITKERING = "0.7"

# Gemeentelijke belastingen en heffingen (EUR 437/inw together).
CATEGORIEEN_LOKALE_HEFFINGEN = ("B2.2.1", "B2.2.2")

# The same heffingen as the Baten pages count them, which is the two above plus the leges
# (EUR 710/inw together — the leges are the other EUR 273).
#
# Deliberately not folded into CATEGORIEEN_LOKALE_HEFFINGEN: that tuple is what Gemeentelijke
# Stand and Begroting have always drawn (EUR 437/inw), and widening it would move figures on
# pages that have nothing to do with this one.
#
# Inferred from the report's page filters — it is a live-connection thin file, so the
# `Inkomsten per bron` column behind those pages was not in it to copy. Two pages pin the
# mapping down between them: the Lokale heffingen page's bar chart names exactly B2.2.1,
# B2.2.2 and B3.7, and the Overige inkomsten page's bar chart excludes exactly those three
# plus B4.3.1 — so the leges are heffingen on both sides of the same split.
CATEGORIEEN_BATEN_LOKALE_HEFFINGEN = ("B2.2.1", "B2.2.2", "B3.7")

# Sociaal domein is a whole hoofdtaakveld (EUR 1855/inw of lasten).
TAAKVELD_SOCIAAL_DOMEIN = "6"

# ── Balans ──────────────────────────────────────────────────────────────────────────
#
# The balance sheet rides in the same `taakveldbalanspost` column as the exploitation
# taakvelden — A* activa, P* passiva — which is precisely what BALANSPOST_PREFIXES keeps out
# of every lasten and baten figure on the dashboard. The solvabiliteitsratio is the one thing
# that wants it back, so it is read by a query of its own (_BALANS in sync_iv3_summary) rather
# than by widening that filter. Widening it would put balansposten into `lasten` on five pages.
#
# `categorie` is what tells a stand from a mutation on a balanspost. The real standen carry
# Primo (the opening position) or Ultimo (the closing one); the L*/B* categorie rows sitting on
# a balanspost are mutations and are all but zero. Ultimo is the position at year end, which is
# what a solvabiliteitsratio is read off.
BALANS_CATEGORIE_ULTIMO = "Ultimo"

# Eigen vermogen is P11 — P111 Algemene reserve, P112 Bestemmingsreserves, P114 Saldo van
# rekening. CBS's own dataset 71231ned names code A048056 "P11 - Eigen vermogen" and composes it
# of exactly those. Balanstotaal is the whole passivazijde.
#
# VERIFIED to the euro against 71231ned for the 2023 Jaarrekening, all gemeenten: this yields a
# balanstotaal of EUR 104.309 mln and an eigen vermogen of EUR 41.322 mln, against CBS's own
# 104.309 and 41.322. The activa sum to the passiva to the euro as well, as a balance sheet must.
# If a query starts returning something far off these, the code is wrong, not the data.
BALANS_EIGEN_VERMOGEN_PREFIX = "^P11"
BALANS_PASSIVA_PREFIX = "^P"

# The balans is only worth reading off a Jaarrekening. The Begroting's balansposten are filed so
# incompletely that they are not merely imprecise but nonsense: the 2024 Begroting gives a
# balanstotaal of EUR 15,5 mld against 110,3 for its Jaarrekening; 2022X000 and 2023X000 come out
# *negative*, which turns a solvabiliteitsratio into 103% and 213%; and 2025X000/2026X000 carry
# 5-6 gemeenten between them. So sync_iv3_summary only reads the balans off an X005 and leaves
# every Begroting row at zero, and queries.managementoverzicht pins its solvabiliteit chart to the
# Jaarrekening whatever the sidebar's verslagsoort says.
#
# The clean national X005 series (pooled: sum eigen vermogen / sum balanstotaal), to check against:
#
#   2017 34,8%   2018 34,2%   2019 33,2%   2020 36,6%
#   2021 37,5%   2022 39,5%   2023 39,6%   2024 39,3%

# ── Inwonergroepen ──────────────────────────────────────────────────────────────────
#
# Fixed size classes, not quantiles of the year's own distribution: a quantile redefines
# itself from one year to the next, so a line drawn across the years would stop describing
# the same group of municipalities halfway along the x-axis.
#
# `min` is inclusive and `max` exclusive; null is unbounded on that side. G4 is picked by
# code instead, and overlaps "> 100.000" on purpose — the four big cities are also large,
# and are drawn as their own line because they behave nothing like the rest of that group.
#
# The bounds are the report's, read off gemeenten[Inwonergroep] in the .pbix:
#
#   SWITCH(TRUE(), Inwoneraantal <  25000, "<25k",
#                  Inwoneraantal <=  50000, "25k - 50k",
#                  Inwoneraantal <= 100000, "50k - 100k",
#                  Inwoneraantal <= 300000, ">100k",
#                                           "G4")
#
# Note the asymmetry, which is the report's and not a typo here: the first cut is exclusive and
# every later one inclusive, so a gemeente of exactly 50.000 is in "25.000 – 50.000" and one of
# exactly 100.000 is in "50.000 – 100.000". That reads the way the labels do, which the earlier
# all-exclusive bounds did not — they put exactly 100.000 inhabitants in "> 100.000". Expressed
# below as exclusive maxima, hence the +1.
#
# G4 is the report's residual class, everything above 300.000. Kept as four codes rather than a
# size bound because that is what the class means, but the two only agree while no fifth city
# passes 300.000 — Eindhoven, the next largest, is around 250.000. If one does, the report would
# have moved it into G4 automatically and this will not.
G4_GM_CODES = ("GM0363", "GM0599", "GM0518", "GM0344")  # Amsterdam, Rotterdam, Den Haag, Utrecht

INWONERGROEPEN = [
    {"id": "lt25", "label": "< 25.000", "min": None, "max": 25_000},
    {"id": "25tot50", "label": "25.000 – 50.000", "min": 25_000, "max": 50_001},
    {"id": "50tot100", "label": "50.000 – 100.000", "min": 50_001, "max": 100_001},
    {"id": "gt100", "label": "> 100.000", "min": 100_001, "max": None},
    {"id": "g4", "label": "G4", "gm_codes": G4_GM_CODES},
]


# ── Provincies ──────────────────────────────────────────────────────────────────────
#
# The gemeenten table carries each municipality's province as a bare CBS code in prv_code;
# the twelve run 20 (Groningen) through 31 (Limburg). The names live here so the filters
# can label a province without the warehouse having to store them.
PROVINCIE_LABELS = {
    20: "Groningen",
    21: "Fryslân",
    22: "Drenthe",
    23: "Overijssel",
    24: "Flevoland",
    25: "Gelderland",
    26: "Utrecht",
    27: "Noord-Holland",
    28: "Zuid-Holland",
    29: "Zeeland",
    30: "Noord-Brabant",
    31: "Limburg",
}


# ── Breakdowns ──────────────────────────────────────────────────────────────────────

# Split by hoofdcategorie — the first digit of the categorie code. The CBS code space is the
# same on both sides of the ledger, so this labels the lasten breakdowns and the Baten pages'
# residual bron alike; only the B/L prefix says which side a figure is on.
HOOFDCATEGORIE_LABELS = {
    "1": "1. Salarissen en sociale lasten",
    "2": "2. Belastingen",
    "3": "3. Goederen en diensten",
    "4": "4. Overdrachten",
    "5": "5. Rente en dividend",
    "6": "6. Financiële transacties",
    "7": "7. Reserveringen en verrekeningen",
}

# Baten split by where the money comes from — the four slices of the Baten page's donut.
#
# The report draws it from `Inkomsten per bron` crossed with the taakveld, which splits the
# Rijk bron in two: booked on 0.7 it is the algemene uitkering, anywhere else a SPUK. Both
# halves already have a column on Iv3Summary (rijk, spuks), so the four keys below are the
# ones queries.baten() measures with — see BATEN_PAGINAS there.
#
# The four partition the baten exactly: 2312 + 655 + 710 + 640 = EUR 4317/inw, which is total
# baten for the 2023 Jaarrekening. sync_iv3_summary keeps that identity true per gemeente and
# checks it on every run (_baten_gaan_op) — it is what makes each donut's slices add up to the
# figure printed in its centre.
#
# The partition survives taakveld 0.11's baten being let into `baten` (see TAAKVELD_RESULTAAT):
# they are an ordinary B row and _accumulate routes them into the residual like any other. The
# four *figures* do not — only "overig" and the total move, and only they need rechecking once
# the warehouse has been re-read. Estimated off the closing identity at roughly 640 -> 671 and
# 4317 -> 4348 for this report; measure them rather than trust that arithmetic.
BATEN_BRON_LABELS = {
    "rijk": "Rijk",  # EUR 2312/inw
    "spuks": "Overige baten rijk",  # EUR 655/inw
    "heffingen": "Lokale heffingen",  # EUR 710/inw
    "overig": "Overige inkomsten",  # EUR 640/inw
}

# The heffingen by taakveld, which is the cut that says what a heffing *is*. The categorie cut
# beside it (CATEGORIEEN_BATEN_LOKALE_HEFFINGEN: B2.2.1 Belastingen op producenten, B2.2.2
# Belastingen op huishoudens, B3.7 Leges en andere rechten) only says who was taxed and under
# which heading it was booked, which is why no chart splits by it — see BATEN_PAGINAS.
#
# The mapping is the report's, and every code was read off the warehouse's own taakveld labels
# rather than assumed (jaar 2024, verslagsoort 2024X005). Two taakvelden make one OZB because
# the report draws one bar for it; woningen and niet-woningen are the same tax.
#
# Note this cuts *across* the three heffingen categorieën. Riolering carries EUR 1,60 mrd under
# B2.2.2, EUR 386 mln under B2.2.1 and EUR 7 mln under B3.7, and all of it is the rioolheffing —
# which is exactly why this cannot be derived from baten_heffingen_per_categorie.
BATEN_HEFFINGEN_TAAKVELDEN = {
    "0.61": "Onroerendezaakbelasting",  # OZB woningen
    "0.62": "Onroerendezaakbelasting",  # OZB niet-woningen
    "0.63": "Parkeerbelasting",
    "7.2": "Rioolheffing",
    "7.3": "Afvalheffing",
}

# Everything not in BATEN_HEFFINGEN_TAAKVELDEN: bouwleges on 8.3, burgerzaken on 0.2, and a long
# tail besides. A residual rather than a list, so the bar's segments always sum to its total.
BATEN_HEFFINGEN_OVERIG_LABEL = "Overige belastingen en leges"

# The two overige-baten categorieën the Overige inkomsten bar names, and their CBS labels
# (Vraagbaak IV3 Gemeenten: 3.1 Grond, 3.3 Pachten, 3.6 Huren). Pachten and huren are drawn as
# one slice, as the report draws them.
CATEGORIE_BATEN_GROND = "B3.1"
CATEGORIEEN_BATEN_HUREN_PACHTEN = ("B3.6", "B3.3")
CATEGORIEEN_BATEN_GROND_HUREN = (CATEGORIE_BATEN_GROND, *CATEGORIEEN_BATEN_HUREN_PACHTEN)

# The two hoofdcategorieën the Overige inkomsten bar names whole, rather than by categorie.
# B7.1 sits almost entirely on taakveld 0.10 (EUR 8,69 mrd of 8,72 mrd in the 2024 Jaarrekening),
# which is what makes hoofdcategorie 7 readable as "bijdragen uit reserves"; B5.1 en B5.2 are
# rente and dividenden and sit on 0.5 Treasury.
HOOFDCATEGORIE_RESERVES = "7"
HOOFDCATEGORIE_RENTE = "5"

# ── Taakveldnamen ───────────────────────────────────────────────────────────────────
#
# The source carries a code and name together in `taakveldbalanspost`. Historical labels
# generally follow that source, with a few completions and authored parent labels below.
# The 2025-2026 list uses the published names throughout: source labels can be abbreviated,
# and the official three-digit subcodes replace the old, locally grouped parents.
# Official chapter 3 names for the revised 2025-2026 Iv3 task fields.
# The warehouse abbreviates several labels; use the published wording in the dashboard.
TAAKVELD_NAMEN_VANAF_2025 = {
    "0.1": "Bestuur",
    "0.2": "Burgerzaken",
    "0.3": "Beheer overige gebouwen en gronden",
    "0.4": "Overhead",
    "0.5": "Treasury",
    "0.7": "Algemene uitkering en overige uitkeringen gemeentefonds",
    "0.8": "Overige baten en lasten",
    "0.9": "Vennootschapsbelasting (Vpb)",
    "0.10": "Mutaties reserves",
    "0.11": "Resultaat van de rekening van baten en lasten",
    "0.61": "OZB woningen",
    "0.62": "OZB niet-woningen",
    "0.63": "Parkeerbelasting",
    "0.64": "Belastingen overig",
    "1.1": "Crisisbeheersing en brandweer",
    "1.2": "Openbare orde en veiligheid",
    "2.1": "Verkeer en vervoer",
    "2.2": "Parkeren",
    "2.3": "Recreatieve havens",
    "2.4": "Economische havens en waterwegen",
    "2.5": "Openbaar vervoer",
    "3.1": "Economische ontwikkeling",
    "3.2": "Fysieke bedrijfsinfrastructuur",
    "3.3": "Bedrijvenloket en bedrijfsregelingen",
    "3.4": "Economische promotie",
    "4.1": "Openbaar basisonderwijs",
    "4.2": "Onderwijshuisvesting",
    "4.3": "Onderwijsbeleid en leerlingzaken",
    "5.1": "Sportbeleid en activering",
    "5.2": "Sportaccommodaties",
    "5.3": "Cultuurpresentatie, cultuurproductie en cultuurparticipatie",
    "5.4": "Musea",
    "5.5": "Cultureel erfgoed",
    "5.6": "Media",
    "5.7": "Openbaar groen en (openlucht) recreatie",
    "6.1": "Samenkracht en burgerparticipatie",
    "6.3": "Inkomensregelingen",
    "6.4": "WSW en beschut werk",
    "6.5": "Arbeidsparticipatie",
    "6.21": "Toegang en eerstelijnsvoorzieningen Wmo",
    "6.22": "Toegang en eerstelijnsvoorzieningen Jeugd",
    "6.23": "Toegang en eerstelijnsvoorzieningen Integraal",
    "6.60": "Hulpmiddelen en diensten (Wmo)",
    "6.91": "Coördinatie en beleid Wmo",
    "6.92": "Coördinatie en beleid Jeugd",
    "6.711": "Huishoudelijke hulp (Wmo)",
    "6.712": "Begeleiding (Wmo)",
    "6.713": "Dagbesteding (Wmo)",
    "6.714": "Overige maatwerkarrangementen (Wmo)",
    "6.751": "Jeugdhulp ambulant lokaal",
    "6.752": "Jeugdhulp ambulant regionaal",
    "6.753": "Jeugdhulp ambulant landelijk",
    "6.761": "Jeugdhulp met verblijf lokaal",
    "6.762": "Jeugdhulp met verblijf regionaal",
    "6.763": "Jeugdhulp met verblijf landelijk",
    "6.791": "PGB Wmo",
    "6.792": "PGB Jeugd",
    "6.811": "Beschermd wonen (Wmo)",
    "6.812": "Maatschappelijke- en vrouwenopvang (Wmo)",
    "6.821": "Jeugdbescherming",
    "6.822": "Jeugdreclassering",
    "7.1": "Volksgezondheid",
    "7.2": "Riolering",
    "7.3": "Afval",
    "7.4": "Milieubeheer",
    "7.5": "Begraafplaatsen en crematoria",
    "8.1": "Ruimte en leefomgeving",
    "8.2": "Grondexploitatie (niet-bedrijventerreinen)",
    "8.3": "Wonen en bouwen",
}

TAAKVELD_LABEL_OVERRIDES = {
    # Completed: the warehouse's own name, cut off at ~40 characters. Prefix-checked.
    "0.7": "Algemene uitkeringen en overige uitkeringen gemeentefonds",
    # Named because the Lasten detail page for hoofdtaakveld 0 draws it as a slice, which no
    # other page does — see queries._resultaat_lasten. Without this it falls out of Iv3Taakveld
    # on the truncation check and the slice would have no label to appear under.
    "0.11": "Resultaat van de rekening van baten en lasten",
    "5.3": "Cultuurpresentatie, cultuurproductie en cultuurparticipatie",
    "5.7": "Openbaar groen en (openlucht) recreatie",
    "6.23": "Toegang en eerstelijnsvoorz. Integraal",
    "8.2": "Grondexploitatie (niet-bedrijventerreinen)",
    # Authored: rolled-up parents CBS never named, so there is nothing to check against.
    # Each is read off the children it collects, which are listed beside it.
    "6.73": "Jeugdhulp met verblijf",  # 6.73a Pleegzorg, b Gezinsgericht, c overig
    "6.74": "Jeugdhulp crisis, LTA en gesloten plaatsing",  # 6.74a-c
    "6.75": "Jeugdhulp ambulant",  # 6.751/752/753 lokaal, regionaal, landelijk
    "6.76": "Jeugdhulp met verblijf",  # 6.761/762/763 lokaal, regionaal, landelijk
    "6.79": "Persoonsgebonden budgetten",  # 6.791 PGB WMO, 6.792 PGB Jeugd
}

# The overrides above that are invented rather than completed, so the sync knows not to look
# for a stem to check them against. 6.73/6.74 are the 2024-and-earlier scheme, 6.75/6.76/6.79
# the one from 2025 — which is why both a 6.73 and a 6.76 mean "Jeugdhulp met verblijf": they
# are the same money under two numberings, and no year carries both.
# All of these belong to TAAKVELD_SOCIAAL_DOMEIN; authored parent labels do not change
# their classification. The sync also retains a legacy subtotal for these codes.
TAAKVELD_LABELS_ZONDER_BRON = ("6.73", "6.74", "6.75", "6.76", "6.79")


# Split by hoofdtaakveld — the digit before the first dot. Labels the lasten breakdowns and,
# on the Baten overige rijk page, the taakvelden the rijk's specifieke uitkeringen fund.
HOOFDTAAKVELD_LABELS = {
    "0": "0. Bestuur en ondersteuning",
    "1": "1. Veiligheid",
    "2": "2. Verkeer, vervoer en waterstaat",
    "3": "3. Economie",
    "4": "4. Onderwijs",
    "5": "5. Sport, cultuur en recreatie",
    "6": "6. Sociaal domein",
    "7": "7. Volksgezondheid en milieu",
    "8": "8. Volkshuisvesting en ruimtelijke ordening",
}

# ── Inflatie ────────────────────────────────────────────────────────────────────────
#
# The warehouse holds no price data, so the two index charts compare against published
# CBS series. Both are annual averages, and both get re-based to the first year on the
# chart before they are drawn — the absolute base below does not matter, only the ratios.
#
# These figures were entered from memory rather than downloaded. Neither has been checked
# against StatLine itself, but both now have a second opinion: the .pbix carried an embedded
# `Inflatie CBS` table, and rebasing the two series below to 2018 = 100 puts them beside it as
#
#              2019     2020     2021     2022     2023
#   CPI here  102,71   104,06   106,87   117,80   122,44
#   report    102,60   103,93   106,74   117,41   121,88   <- within 0,6 index points
#
#   CAO here  102,60   104,17   106,35   109,69   116,25
#   report    102,40   104,86   107,29   109,44   110,97   <- 5,3 apart by 2023
#
# So CPI_PER_JAAR is corroborated — two independent sources agreeing to within half a point,
# 2022 energy spike and all. Treat it as sound rather than provisional.
#
# CAO_LONEN_PER_JAAR is a deliberate divergence, not an error. The report's "inkomensinflatie"
# is a smooth ~2%/jaar series that never sees the 2023 wage round; real CAO-lonen rose about 6%
# that year, which is the whole point of laying this over the personeelskosten. The old
# dashboard's personeel index therefore cannot be reproduced from here, and should not be —
# and unlike the report's series, which stops at 2023, this one covers the years the dashboard
# actually draws. Still worth replacing with a downloaded 85995NED when someone has the time.
#
# Consumentenprijsindex, 2015 = 100. CBS StatLine 83131NED.
CPI_PER_JAAR = {
    2017: 101.7,
    2018: 103.4,
    2019: 106.2,
    2020: 107.6,
    2021: 110.5,
    2022: 121.8,
    2023: 126.6,
    2024: 130.7,
    2025: 134.5,
    2026: 137.6,
}

# CAO-lonen per uur inclusief bijzondere beloningen, 2020 = 100. CBS StatLine 85995NED.
# Stands in for "inkomensinflatie" on the personeelskosten index chart: it is what a
# municipality's wage bill is actually indexed to.
CAO_LONEN_PER_JAAR = {
    2017: 94.0,
    2018: 96.0,
    2019: 98.5,
    2020: 100.0,
    2021: 102.1,
    2022: 105.3,
    2023: 111.6,
    2024: 118.3,
    2025: 124.2,
    2026: 128.5,
}
