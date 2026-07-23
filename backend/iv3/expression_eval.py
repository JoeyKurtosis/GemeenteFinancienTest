"""Safe expression evaluator for user-defined calculation formulas.

Parses simple math expressions over Iv3Summary row fields using Python's ast
module. Only allows: field names, numeric constants, and arithmetic operators
(+, -, *, /). No function calls, imports, attribute access, or anything else.

Usage:
    errors = validate_expression("salarissen + inhuur")
    if not errors:
        fn = compile_expression("salarissen + inhuur")
        result = fn(row)  # row is an Iv3Summary instance or SimpleNamespace
"""

import ast
import operator

# Every numeric field on Iv3Summary that a formula may reference.
ALLOWED_FIELDS = {
    "lasten",
    "baten",
    "reserve_lasten",
    "reserve_baten",
    "sociaal",
    "salarissen",
    "inhuur",
    "verbonden",
    "rijk",
    "spuks",
    "heffingen",
    "salarissen_overhead",
    "inhuur_overhead",
    "eigen_vermogen",
    "balanstotaal",
    "inwoners",
}

FIELD_DESCRIPTIONS = {
    "lasten": "Totale lasten (excl. reservemutaties)",
    "baten": "Totale baten (excl. reservemutaties)",
    "reserve_lasten": "Reservemutaties lasten (taakveld 0.10)",
    "reserve_baten": "Reservemutaties baten (taakveld 0.10)",
    "sociaal": "Lasten sociaal domein (hoofdtaakveld 6)",
    "salarissen": "Salarissen en sociale lasten (categorie L1.1)",
    "inhuur": "Ingeleend personeel (categorie L3.5.1)",
    "verbonden": "Verbonden partijen (categorie L4.3.3)",
    "rijk": "Algemene uitkering gemeentefonds (B4.3.1 op taakveld 0.7)",
    "spuks": "Specifieke uitkeringen van het Rijk",
    "heffingen": "Lokale heffingen (B2.2.1 + B2.2.2)",
    "salarissen_overhead": "Salarissen geboekt op taakveld 0.4 (overhead)",
    "inhuur_overhead": "Inhuur geboekt op taakveld 0.4 (overhead)",
    "eigen_vermogen": "Eigen vermogen (balanspost P11, ultimo)",
    "balanstotaal": "Balanstotaal passiva (ultimo)",
    "inwoners": "Aantal inwoners",
}

_SAFE_BINOPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
}

_SAFE_UNARYOPS = {
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


class _ExpressionError(Exception):
    pass


def _walk_validate(node: ast.AST) -> list[str]:
    """Walk the AST and collect errors for disallowed constructs."""
    errors = []

    if isinstance(node, ast.Expression):
        errors.extend(_walk_validate(node.body))
    elif isinstance(node, ast.BinOp):
        if type(node.op) not in _SAFE_BINOPS:
            errors.append(f"Operator '{type(node.op).__name__}' is niet toegestaan")
        errors.extend(_walk_validate(node.left))
        errors.extend(_walk_validate(node.right))
    elif isinstance(node, ast.UnaryOp):
        if type(node.op) not in _SAFE_UNARYOPS:
            errors.append(f"Operator '{type(node.op).__name__}' is niet toegestaan")
        errors.extend(_walk_validate(node.operand))
    elif isinstance(node, ast.Constant):
        if not isinstance(node.value, (int, float)):
            errors.append(f"Constante '{node.value}' is niet toegestaan (alleen getallen)")
    elif isinstance(node, ast.Name):
        if node.id not in ALLOWED_FIELDS:
            errors.append(f"Veld '{node.id}' bestaat niet. Beschikbare velden: {', '.join(sorted(ALLOWED_FIELDS))}")
    else:
        errors.append(f"Constructie '{type(node).__name__}' is niet toegestaan in formules")

    return errors


def validate_expression(expr: str) -> list[str]:
    """Validate a formula expression. Returns a list of errors (empty = valid)."""
    if not expr or not expr.strip():
        return ["Formule mag niet leeg zijn"]

    try:
        tree = ast.parse(expr.strip(), mode="eval")
    except SyntaxError as e:
        return [f"Syntaxfout: {e.msg}"]

    return _walk_validate(tree)


def _eval_node(node: ast.AST, fields: dict[str, float]) -> float:
    """Recursively evaluate an AST node against field values."""
    if isinstance(node, ast.Expression):
        return _eval_node(node.body, fields)
    elif isinstance(node, ast.BinOp):
        left = _eval_node(node.left, fields)
        right = _eval_node(node.right, fields)
        op = _SAFE_BINOPS[type(node.op)]
        if op is operator.truediv and right == 0:
            return 0.0
        return op(left, right)
    elif isinstance(node, ast.UnaryOp):
        operand = _eval_node(node.operand, fields)
        return _SAFE_UNARYOPS[type(node.op)](operand)
    elif isinstance(node, ast.Constant):
        return float(node.value)
    elif isinstance(node, ast.Name):
        return fields.get(node.id, 0.0)
    else:
        raise _ExpressionError(f"Unexpected node: {type(node).__name__}")


def compile_expression(expr: str):
    """Compile a formula expression into a callable that takes a row.

    Returns a function: (row) -> float
    The row can be an Iv3Summary instance or any object with the allowed fields
    as attributes.
    """
    tree = ast.parse(expr.strip(), mode="eval")

    def evaluate(row) -> float:
        fields = {}
        for name in ALLOWED_FIELDS:
            val = getattr(row, name, 0) or 0
            fields[name] = float(val)
        try:
            return _eval_node(tree, fields)
        except (ZeroDivisionError, TypeError, ValueError):
            return 0.0

    return evaluate
