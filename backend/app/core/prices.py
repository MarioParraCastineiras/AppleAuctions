import re


_NUMERIC_PRICE = re.compile(r"\d+(?:[.,]\d+)?")
_PRICE_WITH_CURRENCY = re.compile(r"(.+?)\s*EUR", re.IGNORECASE)


def normalize_price(value: object) -> object:
    if not isinstance(value, (str, int, float)) or isinstance(value, bool):
        return value

    text = str(value).strip()
    if _NUMERIC_PRICE.fullmatch(text):
        return f"{text} EUR"

    currency_match = _PRICE_WITH_CURRENCY.fullmatch(text)
    if currency_match:
        return f"{currency_match.group(1).strip()} EUR"

    return text
