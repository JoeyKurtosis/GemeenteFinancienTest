"""The tool schemas the assistant is offered, and the dispatch that runs them.

The split with iv3/assistant.py is deliberate: that module owns the *data* — resolving names,
validating arguments, reading the ORM — and knows nothing about OpenRouter or JSON Schema. This
one owns the *protocol* and imports nothing from iv3 but that module.

Everything the model sends is untrusted, including the argument names. `voer_uit` therefore
never raises: every failure comes back as a JSON object the model can read and correct on its
next turn. Turning a typo in a generated JSON blob into a 502 would lose the conversation.
"""

import json
import logging

from iv3 import assistant

logger = logging.getLogger(__name__)

# A tool result is context the model pays for on every subsequent turn of the conversation, so
# an answer that does not fit is a bug in the question rather than something to truncate: a
# clipped JSON blob is worse than no blob, because the model cannot tell it was clipped.
MAX_TOOL_RESULT_CHARS = 4000

# ── Shared schema fragments ─────────────────────────────────────────────────────────
_JAAR = {
    "type": "integer",
    "description": "Jaartal. Roep beschikbare_data aan als je niet weet welke jaren er zijn.",
}

_VERSLAGSOORT = {
    "type": "string",
    "enum": ["Begroting", "Jaarrekening"],
    "description": (
        "Optioneel. Standaard de Jaarrekening; valt automatisch terug op de Begroting als het "
        "jaar nog geen Jaarrekening heeft."
    ),
}

_GEMEENTE = {
    "type": "string",
    "description": 'Naam van de gemeente, bijvoorbeeld "Amsterdam" of "Den Haag".',
}

_METRIEK_ENUM = sorted(assistant.METRIEKEN)

# ── The tools ───────────────────────────────────────────────────────────────────────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "beschikbare_data",
            "description": (
                "De jaren en verslagsoorten waarvoor cijfers beschikbaar zijn, en het aantal "
                "gemeenten. Roep dit aan als de gebruiker geen jaar noemt of als je twijfelt of "
                "een jaar of verslagsoort bestaat."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "gemeente_kerncijfers",
            "description": (
                "Alle kerncijfers van één gemeente in één jaar: totale lasten en baten, sociaal "
                "domein, personele lasten, inhuur, verbonden partijen, algemene uitkering, lokale "
                "heffingen en SPUK's. Elk als totaalbedrag én per inwoner, met het landelijk "
                "gemiddelde erbij. Bij de Jaarrekening ook eigen vermogen, balanstotaal en "
                "solvabiliteit."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "gemeente": _GEMEENTE,
                    "jaar": _JAAR,
                    "verslagsoort": _VERSLAGSOORT,
                },
                "required": ["gemeente", "jaar"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "gemeente_verdeling",
            "description": (
                "Waar het geld van één gemeente naartoe gaat of vandaan komt, verdeeld over "
                "hoofdgroepen. Gebruik dit voor vragen als 'waar geeft Utrecht zijn geld aan uit' "
                "of 'waar komen de inkomsten vandaan'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "gemeente": _GEMEENTE,
                    "jaar": _JAAR,
                    "verslagsoort": _VERSLAGSOORT,
                    "indeling": {
                        "type": "string",
                        "enum": sorted(assistant.VERDELINGEN),
                        "description": (
                            "hoofdtaakveld = waar de lasten aan besteed worden (sociaal domein, "
                            "veiligheid, ...); hoofdcategorie = waaraan (salarissen, goederen en "
                            "diensten, ...); baten_bron = waar de inkomsten vandaan komen."
                        ),
                    },
                },
                "required": [*("gemeente", "jaar", "indeling")],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "vergelijk_gemeenten",
            "description": (
                "Twee tot vijf gemeenten naast elkaar op maximaal vier metrieken, met het "
                "landelijk gemiddelde erbij."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "gemeenten": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 2,
                        "maxItems": assistant.MAX_VERGELIJKING,
                        "description": "Namen van de gemeenten.",
                    },
                    "jaar": _JAAR,
                    "verslagsoort": _VERSLAGSOORT,
                    "metrieken": {
                        "type": "array",
                        "items": {"type": "string", "enum": _METRIEK_ENUM},
                        "maxItems": assistant.MAX_VERGELIJK_METRIEKEN,
                        "description": "Optioneel; standaard lasten, sociaal en personeel.",
                    },
                },
                "required": ["gemeenten", "jaar"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "ranglijst",
            "description": (
                "De gemeenten die het hoogst of het laagst scoren op één metriek, met het "
                "landelijk gemiddelde en de mediaan. Optioneel te beperken tot één provincie of "
                "één inwonergroep."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "jaar": _JAAR,
                    "metriek": {"type": "string", "enum": _METRIEK_ENUM},
                    "verslagsoort": _VERSLAGSOORT,
                    "per_inwoner": {
                        "type": "boolean",
                        "description": (
                            "Standaard true. Een ranglijst op totaalbedrag is vrijwel altijd "
                            "gewoon de ranglijst op inwonertal."
                        ),
                    },
                    "richting": {"type": "string", "enum": ["hoogste", "laagste"]},
                    "aantal": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": assistant.MAX_RANGLIJST,
                    },
                    "provincie": {
                        "type": "string",
                        "description": 'Optioneel, bijvoorbeeld "Utrecht" of "Limburg".',
                    },
                    "inwonergroep": {
                        "type": "string",
                        "enum": [*("lt25", "25tot50", "50tot100", "gt100", "g4")],
                        "description": (
                            "Optioneel. lt25 = onder 25.000 inwoners, gt100 = boven 100.000, "
                            "g4 = Amsterdam, Rotterdam, Den Haag en Utrecht."
                        ),
                    },
                },
                "required": ["jaar", "metriek"],
            },
        },
    },
]

_DISPATCH = {
    "beschikbare_data": assistant.beschikbare_data,
    "gemeente_kerncijfers": assistant.gemeente_kerncijfers,
    "gemeente_verdeling": assistant.gemeente_verdeling,
    "vergelijk_gemeenten": assistant.vergelijk_gemeenten,
    "ranglijst": assistant.ranglijst,
}

# The keyword arguments each tool will actually accept. The schemas above already say this, but
# the model is free to ignore them, and `f(**argumenten)` on an invented key is a TypeError
# rather than something it can correct. Dropped and logged instead.
_TOEGESTANE_ARGS = {
    "beschikbare_data": frozenset(),
    "gemeente_kerncijfers": frozenset({"gemeente", "jaar", "verslagsoort"}),
    "gemeente_verdeling": frozenset({"gemeente", "jaar", "verslagsoort", "indeling"}),
    "vergelijk_gemeenten": frozenset({"gemeenten", "jaar", "verslagsoort", "metrieken"}),
    "ranglijst": frozenset(
        {
            "jaar",
            "metriek",
            "verslagsoort",
            "per_inwoner",
            "richting",
            "aantal",
            "provincie",
            "inwonergroep",
        }
    ),
}


def voer_uit(naam, argumenten_json) -> str:
    """Run one tool call and return its result as a JSON string. Never raises.

    Every failure below is returned *to the model* rather than raised, because every one of them
    is something it can fix on the next turn: a misspelled gemeente, a year that does not exist,
    an argument it left out.
    """
    if naam not in _DISPATCH:
        return _fout("onbekende_tool", f"De tool {naam!r} bestaat niet.")

    try:
        argumenten = json.loads(argumenten_json or "{}")
    except (TypeError, json.JSONDecodeError):
        return _fout("ongeldige_argumenten", "De argumenten waren geen geldige JSON.")
    if not isinstance(argumenten, dict):
        return _fout("ongeldige_argumenten", "De argumenten waren geen object.")

    verzonnen = set(argumenten) - _TOEGESTANE_ARGS[naam]
    for sleutel in verzonnen:
        argumenten.pop(sleutel)
    if verzonnen:
        logger.info("Tool %s kreeg onbekende argumenten: %s", naam, sorted(verzonnen))

    try:
        resultaat = _DISPATCH[naam](**argumenten)
    except assistant.GemeenteOnbekend as exc:
        return _fout(
            exc.reden,
            f"De gemeente {exc.gevraagd!r} kon niet worden gevonden.",
            bedoelde_je=exc.suggesties,
        )
    except assistant.ArgumentFout as exc:
        return _fout("ongeldig_argument", str(exc))
    except TypeError as exc:
        # A required argument the model left out, or one it passed positionally. Its own
        # mistake, and the message names the parameter, so hand it back rather than 500.
        return _fout("ongeldige_argumenten", f"Ontbrekend of ongeldig argument: {exc}")
    except Exception:
        logger.exception("Tool %s faalde.", naam)
        return _fout("interne_fout", "Deze gegevens konden niet worden opgehaald.")

    tekst = json.dumps(resultaat, ensure_ascii=False, separators=(",", ":"))
    if len(tekst) > MAX_TOOL_RESULT_CHARS:
        logger.error("Tool %s gaf %d tekens terug.", naam, len(tekst))
        return _fout("te_groot", "Het resultaat was te groot. Stel een specifiekere vraag.")
    return tekst


def dashboard_context(rauw) -> str | None:
    """The user's current dashboard filters, as a line to put in front of the conversation.

    Returns None when there is nothing useful to say, so the caller can leave the system prompt
    alone rather than adding an empty sentence for the model to interpret.

    Never raises, for the same reason voer_uit does not: this arrives from a browser, and a
    stale or hand-edited filter state should cost the assistant its context, not the request.
    """
    if not isinstance(rauw, dict):
        return None

    try:
        gekozen = assistant.dashboard_selectie(
            gemeente=rauw.get("gemeente"),
            jaar=rauw.get("jaar"),
            verslagsoort=rauw.get("verslagsoort"),
        )
    except Exception:
        logger.exception("Could not resolve the dashboard selection.")
        return None

    delen = []
    if gekozen["gemeente"]:
        delen.append(f"gemeente {gekozen['gemeente']}")
    if gekozen["jaar"]:
        delen.append(f"jaar {gekozen['jaar']}")
    if gekozen["verslagsoort"]:
        delen.append(f"verslagsoort {gekozen['verslagsoort']}")
    if not delen:
        return None

    return (
        "De gebruiker kijkt op dit moment in het dashboard naar: "
        + ", ".join(delen)
        + ".\n"
        "Gebruik dit als de vraag zelf geen gemeente, jaar of verslagsoort noemt — 'mijn "
        "gemeente', 'deze gemeente', 'hier' of een vraag zonder jaartal slaan hierop. Noemt de "
        "gebruiker wél zelf een gemeente of een jaar, dan gaat dat altijd voor. Zeg in je "
        "antwoord welke gemeente, welk jaar en welke verslagsoort je hebt gebruikt, zodat de "
        "gebruiker ziet waar het cijfer vandaan komt."
    )


def _fout(code: str, bericht: str, **extra) -> str:
    return json.dumps({"fout": code, "toelichting": bericht, **extra}, ensure_ascii=False)
