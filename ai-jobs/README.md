# Python 리뷰 분석 작업

Python 디렉터리는 현재 HTTP 서버를 제공하지 않는다. 모의 리뷰 작업·근거 검증·파일 내보내기와 승인된 행신 자료의 선택적 검증에 사용한다.

- [리뷰 분석과 실행 방법](../docs/ai-review-analysis.md)
- [실시간 Express 추천](../docs/ai-recommendation.md)
- [모의 노트북](notebooks/mock_data_development.ipynb): DB·외부 API 없이 Python 리뷰 작업과 Express 모의 테스트를 실행한다.
- [행신 자료 노트북](notebooks/real_data_ready.ipynb): 기본 DB 실행 중지. 승인된 staging 자료 검증용이다.

`requirements.txt`는 리뷰 요약의 필수 pydantic만 포함한다. 노트북과 행신 DB 검증 의존성은 각각 `requirements-notebook.txt`, `requirements-mysql.txt`에 있다. 운영용 Python 작업 이미지·스케줄러·실제 분석 DB는 아직 없다.

## 로컬 환경 준비

저장소 루트에서 실행한다. 가상환경은 이전 경로에서 복사하지 말고 새 위치에 생성한다. 기존 환경이 있으면 먼저 새 위치의 Python 실행 경로를 확인한다.

```powershell
cd ai-jobs
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_*.py'
```

노트북에는 추가로 requirements-notebook.txt를 설치하고 ai-jobs/.venv 커널을 선택한다. 예전 ai-server/.venv를 선택하지 않는다. Python 3.11 이상이 필요하다.
