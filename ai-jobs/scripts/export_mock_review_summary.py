"""Offline mock analysis job. No HTTP server, actual DB, or Gemini access."""
from pathlib import Path
import json
import sys
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.review_summary import Review, SummaryService, MockReviewSummarizer


def main():
    output = ROOT.parent / 'backend' / 'artifacts' / 'mock-review-summary.json'
    with TemporaryDirectory() as folder:
        service = SummaryService(Path(folder) / 'summary.sqlite', MockReviewSummarizer())
        summary, _ = service.refresh(990001, [Review(1, 990001, '평일에는 조용해요.'),
            Review(2, 990001, '주말에는 시끄러워요.'), Review(3, 990001, '좌석이 넓어요.')])
    output.parent.mkdir(exist_ok=True)
    temp = output.with_suffix('.tmp')
    temp.write_text(json.dumps({'data_mode': 'mock', 'status': 'READY', 'cache_hit': True,
        'llm_calls': 0, 'summary': summary}, ensure_ascii=False), encoding='utf-8')
    temp.replace(output)
    print('Mock analysis artifact exported; no Python HTTP server required')


if __name__ == '__main__':
    main()
