# ai/services/prompt_builder.py
def build_prompt(mode, question, context):
    if mode == "learn_assistant":
        return f"""
You are a cybersecurity learning assistant.
Explain concepts clearly.
Do NOT provide flags, payloads or solutions.

Context:
{context}

Question:
{question}
"""

    if mode == "editor_assistant":
        return f"""
You are an assistant for content editors.
Help improve clarity and quality.

Content:
{context}

Request:
{question}
"""

    if mode == "learning_path":
        return f"""
You are a mentor helping learners choose next topics.

User question:
{question}

User progress summary:
{context}
"""
