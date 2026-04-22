이 프로젝트의 변경 사항을 리뷰하라.

먼저 다음 문서들을 읽어라:
- `/CLAUDE.md`
- `/docs/PRD.md`
- `/docs/ADR.md`
- `/docs/ARCHITECTURE.md`
- `/docs/UI_GUIDE.md` (UI 변경이 있는 경우)

그런 다음 변경된 파일들을 확인하고, 아래 체크리스트로 검증하라.

## 체크리스트

1. **아키텍처 준수**: `ARCHITECTURE.md` 에 정의된 디렉터리 구조 (`apps/{api,admin,widget,landing}`, `packages/schema`, `infra/{supabase,neo4j,observability}`, `docs/`, `phases/`, `scripts/`, `.claude/`) 를 따르는가? 계약되지 않은 임의 디렉터리 신설 없음?
2. **기술 스택 준수 (ADR-004 ~ ADR-008)**:
   - 파싱은 Docling (+ LibreOffice HWP fallback) 만 사용하고 pymupdf/pyhwp 를 신규 도입하지 않았는가? (ADR-004)
   - 에이전트는 **PydanticAI** (구조화 출력) + **LangGraph** (state machine) 조합을 유지하는가? (ADR-005)
   - Graph DB 로 **Neo4j 5 Community** 를 사용하는가? PostgreSQL 관계 테이블로 에뮬레이션하지 않았는가? (ADR-006)
   - Retrieval 이 **7-way hybrid + RRF fusion + Authority Reranker** 패턴을 따르는가? (ADR-007)
   - LLM 은 **Provider-agnostic factory** (Anthropic / OpenAI / Gemini / Ollama) 를 경유하고 단일 provider 하드코딩이 없는가? (ADR-008)
3. **멀티테넌트 불변식 (ADR-002, 위반 즉시 차단)**:
   - 모든 API 엔드포인트에 `tenant_id` 주입 강제 미들웨어 적용?
   - PostgreSQL 테이블에 `tenant_id` 컬럼 + RLS 정책 (`tenant_id::text = current_setting('app.tenant_id', true)`)?
   - Neo4j 모든 노드에 `tenant_id` 속성 + label `t_<uuid>` + **모든 Cypher 쿼리에 label 필터** 강제?
   - Redis 키 네임스페이스 `t:{id}:...` 강제?
   - Object Storage 경로 `tenants/{id}/...` 강제?
4. **데이터 주권 (ADR-003 egress_policy)**:
   - 외부 LLM / 임베딩 / observability 호출이 전부 Provider factory 를 경유?
   - 공공 테넌트 (`egress_policy = DENY_ALL_INTERNATIONAL`) 경로에서 해외 SaaS (OpenAI / Anthropic / Gemini / Langfuse Cloud) 호출 가능한 분기가 남아있지 않은가?
   - Langfuse 사용 시 self-hosted 인스턴스?
5. **Evidence-First (ADR-009)**:
   - 모든 `/v1/chat` 응답의 `source_chunk_ids ⊆ retrieved_set`?
   - L4 Graph / L5 Community / L7 Conversation / L8 Curated 가 retrieval pool 확장 용도만 사용되고 답변 본문에 직접 삽입되지 않는가? (L8 curated 는 citable 이지만 underlying `source_chunk_ids` 가 L2 실 chunks 로 연쇄되어야 함 — transitive grounding)
   - `grounded=false` 시 `answer=null` + `human_transfer_required=true` 로 강제 전환?
   - 모든 retrieval 응답에 `source_id + chunk_id + score + embedding_version + model_version` 감사 기록?
6. **lineage_id 추적 (ADR-011)**: 새 데이터 객체 (chunks · qa_pairs · entities · graph nodes · communities · curated_summaries · conversation_insights) 에 `lineage_id` UUID 필드 포함?
7. **DomainRegistry (ADR-010)**: 신규 도메인 추가가 `DomainConfig` 스키마 (code / detection_keywords / authority_hierarchy / entity_types / relation_types / synonyms / example_questions 등) 안에서 해결되는가? 도메인 로직 하드코딩 없음?
8. **테스트 존재**: 신규 기능에 pytest / ruff / pyright (또는 프론트 `pnpm --filter <app> test/build`) 통과 테스트가 동반되는가? 기존 테스트를 깨뜨리지 않았는가?
9. **CRITICAL 규칙**: CLAUDE.md 및 ADR.md 의 CRITICAL 마커 규칙을 위반하지 않았는가?
10. **AC 실행 검증**: step 에 명시한 Acceptance Criteria 커맨드가 실제로 에러 없이 통과하는가?
11. **UI 변경이 있는 경우**: UI_GUIDE.md 의 라이트 모드 팔레트 · Pretendard · AI 슬롭 안티패턴 · 접근성 (WCAG AA, `prefers-reduced-motion`) · **AI 고지 문구 불변** 규칙을 준수?

## 출력 형식

| 번호 | 항목 | 결과 | 비고 |
|------|------|------|------|
| 1 | 아키텍처 준수 | ✅/❌ | {상세} |
| 2 | 기술 스택 준수 | ✅/❌ | {상세} |
| 3 | 멀티테넌트 불변식 | ✅/❌ | {상세} |
| 4 | 데이터 주권 | ✅/❌ | {상세} |
| 5 | Evidence-First | ✅/❌ | {상세} |
| 6 | lineage_id 추적 | ✅/❌ | {상세} |
| 7 | DomainRegistry | ✅/❌ | {상세} |
| 8 | 테스트 존재 | ✅/❌ | {상세} |
| 9 | CRITICAL 규칙 | ✅/❌ | {상세} |
| 10 | AC 실행 검증 | ✅/❌ | {상세} |
| 11 | UI_GUIDE 준수 | ✅/❌/N-A | {상세} |

위반 사항이 있으면 **수정 방안을 구체적 파일 경로 · 라인 번호 · 코드 스니펫으로 제시**하라. "이런 식으로 고쳐라" 수준의 추상 지시 금지.
