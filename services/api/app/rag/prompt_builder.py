"""
VibeGPT API – Prompt Builder

Responsible for building structured prompts for the LLM based on:
- Labeled retrieved context chunks (S1, S2, ...)
- Subject-specific or default answer rules (word counts, layout instructions, required elements)
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.answer_rule import AnswerRule
    from app.models.document import DocumentChunk


class PromptBuilder:
    """Helper to build grounded LLM system and user prompts."""

    def build_system_prompt(self) -> str:
        """
        Build the grounding system prompt for the Ollama LLM.
        Enforces strict reliance on context and citation labeling.
        """
        return (
            "You are an academic expert assistant for students. Your sole task is to generate "
            "clear, structured, and exam-ready answers to the student's question based strictly "
            "on the provided Study Materials (Context).\n\n"
            "Follow these rules for grounding and citations:\n"
            "1. Rely ONLY on the provided Study Materials. Do not assume, extrapolate, or bring in any external knowledge.\n"
            "2. If the Study Materials do not contain sufficient evidence to answer the student's question, "
            "you MUST respond exactly with: \"Insufficient context to answer the question based on the provided study materials.\"\n"
            "3. Citations: You MUST cite the source materials in your answer using their labels like [S1], [S2], etc., "
            "inline directly next to any statement or facts derived from them. Do not bundle citations at the end.\n"
            "4. Directness: Do not include any introductory remarks, conversational preambles (e.g., \"Sure! Here is your answer:\"), "
            "or sign-offs. Start directly with the answer content.\n"
            "5. Academic Tone: Keep a formal, precise, and academic tone."
        )

    def build_user_prompt(
        self,
        question: str,
        chunks: list[DocumentChunk],
        rule: AnswerRule,
    ) -> str:
        """
        Build the user prompt by merging the student question, labeled context chunks,
        and constraints specified by the active AnswerRule.
        """
        # 1. Format the context chunks with labels [S1], [S2], etc.
        formatted_chunks = []
        for idx, chunk in enumerate(chunks, 1):
            doc_name = chunk.document.document_name if (chunk.document and chunk.document.document_name) else "Study Material"
            source_detail = f"Source {doc_name}"
            if chunk.page_number is not None:
                source_detail += f" (Page {chunk.page_number})"
            elif chunk.slide_number is not None:
                source_detail += f" (Slide {chunk.slide_number})"

            formatted_chunks.append(
                f"[S{idx}] {source_detail}:\n{chunk.content.strip()}"
            )

        context_text = "\n\n".join(formatted_chunks) if formatted_chunks else "No study materials available."

        # 2. Build layouts and constraints guidelines from AnswerRule
        layout_rules = []
        if rule.use_bullet_points:
            layout_rules.append("- Format the response primarily using clear bullet points.")
        else:
            layout_rules.append("- Format the response using clean, well-spaced paragraphs instead of bullet points.")

        if rule.num_points:
            layout_rules.append(f"- Outline exactly {rule.num_points} distinct key points in the answer.")

        if rule.require_formula:
            layout_rules.append("- You must write out any relevant formulas mentioned in the context.")

        if rule.require_example:
            layout_rules.append("- Incorporate at least one concrete example or case study from the context.")

        if rule.require_conclusion:
            layout_rules.append("- End the answer with a dedicated concluding paragraph summarizing the key takeaways.")

        if rule.required_sections:
            sections_str = ", ".join(rule.required_sections)
            layout_rules.append(f"- Ensure the content covers these structural areas: {sections_str}.")

        layout_constraints = "\n".join(layout_rules)

        # 3. Construct the prompt body
        user_prompt = (
            f"Please generate a high-quality answer for the following question.\n\n"
            f"STUDENT QUESTION:\n"
            f"\"{question}\"\n\n"
            f"STUDY MATERIALS (CONTEXT):\n"
            f"{context_text}\n\n"
            f"GRADING & FORMATTING CONSTRAINTS:\n"
            f"- Marks Allocated: {rule.marks} Marks\n"
            f"- Word Count Range: {rule.min_words} to {rule.max_words} words (strict adherence required)\n"
            f"- Style: {rule.preferred_style or 'academic'}\n"
            f"{layout_constraints}\n\n"
            f"GENERATE EXAM-READY ANSWER:"
        )

        return user_prompt
