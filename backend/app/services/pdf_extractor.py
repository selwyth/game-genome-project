import pdfplumber


def extract_text(pdf_bytes: bytes, max_chars: int = 40_000) -> str:
    """Extract text from a PDF, capped at max_chars to fit in the prompt."""
    import io
    text_parts = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
            if sum(len(p) for p in text_parts) >= max_chars:
                break
    full = "\n".join(text_parts)
    return full[:max_chars]
