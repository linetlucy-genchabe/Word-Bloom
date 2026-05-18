"""
Loads precomputed puzzle word lists from puzzle_words.json.
Startup is instant — no dictionary computation at runtime.

To regenerate the word lists (e.g. after adding new puzzles), run:
    python game/generate_words.py
"""
import json
from pathlib import Path

LEVEL_CONFIG = {
    "beginner": {"min_len": 3, "time": 180, "label": "Beginner"},
    "easy":     {"min_len": 3, "time": 150, "label": "Easy"},
    "medium":   {"min_len": 4, "time": 120, "label": "Medium"},
    "hard":     {"min_len": 4, "time": 90,  "label": "Hard"},
    "expert":   {"min_len": 5, "time": 60,  "label": "Expert"},
}

_json_path = Path(__file__).parent / "puzzle_words.json"

with open(_json_path) as f:
    _raw = json.load(f)

# Build PUZZLE_WORDS with word_set for O(1) lookup
PUZZLE_WORDS = {}
for level, puzzles in _raw.items():
    PUZZLE_WORDS[level] = []
    for p in puzzles:
        PUZZLE_WORDS[level].append({
            "letters":  p["letters"],
            "words":    p["words"],
            "word_set": set(p["words"]),
            "count":    p["count"],
        })