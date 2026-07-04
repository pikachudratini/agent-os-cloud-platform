# Research Corpus

This folder follows the source packet ingestion architecture.

- `eric-michaud/`: one JSON record per analyzed video, oldest to newest, plus `_timeline.md` and `_features.md` after ingestion.
- `nick-vasiles/`: one JSON record per analyzed video, oldest to newest, plus `_timeline.md` and `_features.md` after ingestion.
- `_synthesis/`: `current_state.md`, `contradictions.md`, and `feature_matrix.md` after both channels are processed.
- `_source/`: original architecture and build plan supplied for this kickoff.

Every per-video record must come from an actual Gemini video analysis call with the video URL in the prompt. Do not summarize channels from memory.
