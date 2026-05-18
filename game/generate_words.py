"""
Run this script whenever you want to add new puzzles or regenerate word lists.
It uses pyenchant to find all valid English words for each puzzle.

Usage:
    python game/generate_words.py
"""
import enchant, json
from itertools import permutations
from pathlib import Path

d = enchant.Dict("en_US")

PUZZLE_LETTERS = {
    "beginner": ["GARDEN", "SIMPLE", "PLANET"],
    "easy":     ["TEACHER", "BLANKET", "SUNRISE"],
    "medium":   ["ELEPHANT", "CHILDREN", "STANDING"],
    "hard":     ["BEAUTIFUL", "WONDERFUL"],
    "expert":   ["MARKETS", "FRIENDS", "MOTHERS", "DRAGONS", "FINGERS"],
}

LEVEL_CONFIG = {
    "beginner": {"min_len": 3},
    "easy":     {"min_len": 3},
    "medium":   {"min_len": 4},
    "hard":     {"min_len": 4},
    "expert":   {"min_len": 5},
}

def compute_words(letters, min_len=3):
    letters = letters.upper()
    seen = set()
    valid = set()
    for length in range(min_len, len(letters) + 1):
        for perm in permutations(letters, length):
            word = ''.join(perm)
            if word in seen:
                continue
            seen.add(word)
            if d.check(word.lower()):
                valid.add(word)
    return sorted(valid)

if __name__ == "__main__":
    cache = {}
    for level, puzzles in PUZZLE_LETTERS.items():
        min_len = LEVEL_CONFIG[level]["min_len"]
        cache[level] = []
        for letters in puzzles:
            print(f"Computing {letters}...", flush=True)
            words = compute_words(letters, min_len)
            cache[level].append({"letters": letters, "words": words, "count": len(words)})
            print(f"  → {len(words)} words")

    out = Path(__file__).parent / "puzzle_words.json"
    with open(out, "w") as f:
        json.dump(cache, f, indent=2)
    print(f"\nSaved to {out}")