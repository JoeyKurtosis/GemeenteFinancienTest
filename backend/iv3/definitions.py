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
# reservemutaties toggle switches on. 0.11 is the resulting saldo — counting it alongside
# the lasten and baten it is derived from would double the result.
TAAKVELD_RESERVEMUTATIES = "0.10"
TAAKVELD_RESULTAAT = "0.11"

# The sociaal domein subdivides its taakvelden a level deeper than the rest, and has done it
# two different ways. Until 2024 the children carried a letter — 6.71 Maatwerkdienstverlening
# 18+ was specified by 6.71a Huishoudelijke hulp, 6.71b Begeleiding. From 2025 CBS renumbered
# them into a third digit instead: 6.711 Huishoudelijke hulp, 6.712 Begeleiding, and new
# families like 6.751/6.752/6.753 Jeugdhulp ambulant.
#
# The Lasten donuts roll both back up to the parent: drop a trailing letter, then keep two
# digits after the dot. One rule for both schemes, and the only one that keeps hoofdtaakveld 6
# readable — 28 slices in 2023 and 26 in 2026 unrolled, 12 and 16 after.
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
G4_GM_CODES = ("GM0363", "GM0599", "GM0518", "GM0344")  # Amsterdam, Rotterdam, Den Haag, Utrecht

INWONERGROEPEN = [
    {"id": "lt25", "label": "< 25.000", "min": None, "max": 25_000},
    {"id": "25tot50", "label": "25.000 – 50.000", "min": 25_000, "max": 50_000},
    {"id": "50tot100", "label": "50.000 – 100.000", "min": 50_000, "max": 100_000},
    {"id": "gt100", "label": "> 100.000", "min": 100_000, "max": None},
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
BATEN_BRON_LABELS = {
    "rijk": "Rijk",  # EUR 2312/inw
    "spuks": "Overige baten rijk",  # EUR 655/inw
    "heffingen": "Lokale heffingen",  # EUR 710/inw
    "overig": "Overige inkomsten",  # EUR 640/inw
}

# The lokale heffingen split, keyed by the categorie codes of
# CATEGORIEEN_BATEN_LOKALE_HEFFINGEN. Labels as the report's own bar chart writes them.
BATEN_HEFFINGEN_LABELS = {
    "B2.2.1": "2.2.1 Belastingen op producenten",
    "B2.2.2": "2.2.2 Belastingen op huishoudens",
    "B3.7": "3.7 Leges en andere rechten",
}

# The hoofdcategorieën the Overige inkomsten donut splits into: HOOFDCATEGORIE_LABELS without
# the salarissen. A gemeente is not paid a salary — 1 is a cost categorie, and it never occurs
# as a baat anywhere in the warehouse (checked over every jaar and verslagsoort), so leaving it
# in would only put a permanently empty slice in the legend. The rest are all reachable, 7
# included: the reservemutaties the sidebar toggle folds in are booked there almost to the euro
# (EUR 491/inw of the 491), and they land in this bron. Defined here rather than inline so the
# donut and the labels beside it cannot drift apart.
BATEN_OVERIG_HOOFDCATEGORIE_LABELS = {
    code: label for code, label in HOOFDCATEGORIE_LABELS.items() if code != "1"
}

# ── Taakveldnamen ───────────────────────────────────────────────────────────────────
#
# The individual taakvelden are labelled from the warehouse rather than from a list here:
# `taakveldbalanspost` carries the name alongside the code ("0.1 Bestuur"), and
# sync_iv3_summary lifts it into the Iv3Taakveld table. That keeps 49 of the 55 names
# authoritative and self-maintaining, which a hand-typed list of 55 would not be — see the
# CPI_PER_JAAR note at the bottom of this module for how that goes.
#
# Six need help, and only these six:
#
#   * Four are truncated in the warehouse at ~40 characters, ".." and all. Each is completed
#     below, and sync_iv3_summary asserts the warehouse's own stem still prefixes what is
#     written here — so if CBS renames one, the sync says so rather than quietly disagreeing.
#
#   * 6.73 and 6.74 have no bare row at all: the warehouse only carries their children
#     (6.73a Pleegzorg, 6.74c Gesloten plaatsing, ...), because CBS never gave the parents a
#     name of their own. These two are AUTHORED — there is no stem to check them against, and
#     they are the one place in this pipeline where a name is invented rather than read.
TAAKVELD_LABEL_OVERRIDES = {
    # Completed: the warehouse's own name, cut off at ~40 characters. Prefix-checked.
    "0.7": "Algemene uitkeringen en overige uitkeringen gemeentefonds",
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
# UNVERIFIED: these figures were entered from memory and have not been checked against
# StatLine. They are the right order of magnitude and carry the right shape (the 2022
# energy spike is there), but treat them as placeholders until someone downloads the
# tables. Everything else in this module was validated against the warehouse; this was not.
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
