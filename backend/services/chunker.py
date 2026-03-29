 # format: [(idx, text, token_count)]




def chunk_text(text: str, max_tokens: int = 500) -> list:
    """
    Simple chunking by splitting text into paragraphs and grouping them
    until max_tokens is reached. Returns list of (chunk_index, text, token_count).
    """

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current_chunk = []
    current_tokens = 0

    for para in paragraphs:
        # Simple token estimation: 1 token ≈ 4 chars
        para_tokens = len(para) // 4

        if current_tokens + para_tokens > max_tokens and current_chunk:
            # Save current chunk
            chunk_text = "\n\n".join(current_chunk)
            chunks.append((len(chunks), chunk_text, current_tokens))
            current_chunk = []
            current_tokens = 0

        current_chunk.append(para)
        current_tokens += para_tokens

    # Add last chunk
    if current_chunk:
        chunk_text = "\n\n".join(current_chunk)
        chunks.append((len(chunks), chunk_text, current_tokens))

    return chunks