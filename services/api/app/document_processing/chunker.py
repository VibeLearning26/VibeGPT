"""
VibeGPT – Document Chunker

Split parsed document elements into chunks suitable for embedding.
Preserves page/slide/sheet metadata and heading context.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional

try:
    import tiktoken
    ENCODER = tiktoken.get_encoding("cl100k_base")
except Exception:
    ENCODER = None


@dataclass
class DocumentChunk:
    """A chunk of document content ready for embedding."""
    content: str
    page_number: Optional[int] = None
    slide_number: Optional[int] = None
    sheet_name: Optional[str] = None
    heading: Optional[str] = None
    chunk_index: int = 0
    token_count: int = 0
    metadata: dict = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        if self.token_count == 0:
            self.token_count = count_tokens(self.content)


def count_tokens(text: str) -> int:
    """Count tokens using tiktoken if available, fallback to word count * 1.3."""
    if ENCODER:
        return len(ENCODER.encode(text))
    # Rough approximation: 1 token ≈ 0.75 words
    return int(len(text.split()) * 1.3)


def split_by_tokens(text: str, max_tokens: int = 500, overlap: int = 50) -> List[str]:
    """Split text into chunks by token count with overlap."""
    if not text:
        return []
    
    if ENCODER:
        tokens = ENCODER.encode(text)
        if len(tokens) <= max_tokens:
            return [text]
        
        chunks = []
        start = 0
        while start < len(tokens):
            end = min(start + max_tokens, len(tokens))
            chunk_tokens = tokens[start:end]
            chunks.append(ENCODER.decode(chunk_tokens))
            start += max_tokens - overlap
        return chunks
    else:
        # Fallback: split by sentences
        sentences = re.split(r"(?<=[.!?])\s+", text)
        chunks = []
        current = []
        current_tokens = 0
        
        for sent in sentences:
            sent_tokens = int(len(sent.split()) * 1.3)
            if current_tokens + sent_tokens > max_tokens and current:
                chunks.append(" ".join(current))
                current = [sent]
                current_tokens = sent_tokens
            else:
                current.append(sent)
                current_tokens += sent_tokens
        
        if current:
            chunks.append(" ".join(current))
        
        return chunks


def chunk_elements(
    elements: List,
    max_tokens: int = 500,
    overlap: int = 50,
) -> List[DocumentChunk]:
    """
    Convert parsed elements into chunks.
    
    Strategy:
    1. Each element (page/slide/sheet) is a logical unit
    2. If element content > max_tokens, split with overlap
    3. Preserve heading as context prefix
    4. Assign sequential chunk_index
    """
    chunks = []
    chunk_index = 0
    
    for elem in elements:
        # Build content with heading context
        content_parts = []
        if elem.heading:
            content_parts.append(f"# {elem.heading}")
        if elem.content:
            content_parts.append(elem.content)
        
        full_content = "\n\n".join(content_parts)
        if not full_content.strip():
            continue
        
        # Split if needed
        if count_tokens(full_content) <= max_tokens:
            chunks.append(DocumentChunk(
                content=full_content,
                page_number=elem.page_number,
                slide_number=elem.slide_number,
                sheet_name=elem.sheet_name,
                heading=elem.heading,
                chunk_index=chunk_index,
                metadata={
                    **elem.metadata,
                    "heading": elem.heading,
                }
            ))
            chunk_index += 1
        else:
            # Split with overlap
            sub_chunks = split_by_tokens(full_content, max_tokens, overlap)
            for sub in sub_chunks:
                chunks.append(DocumentChunk(
                    content=sub,
                    page_number=elem.page_number,
                    slide_number=elem.slide_number,
                    sheet_name=elem.sheet_name,
                    heading=elem.heading,
                    chunk_index=chunk_index,
                    metadata={
                        **elem.metadata,
                        "heading": elem.heading,
                    }
                ))
                chunk_index += 1
    
    return chunks