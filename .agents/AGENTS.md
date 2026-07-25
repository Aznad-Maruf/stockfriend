# StockFriend — Project Rules & Coding Standards

## Architecture

### Layer Separation
The codebase follows a strict 3-layer architecture:
1. **Data Layer** (`src/services/`) — Fetch, parse, transform raw data. No business logic.
2. **Domain Layer** (`src/engine/`) — Scoring, projection, suggestion, rationale. No I/O or UI.
3. **Presentation Layer** (`src/components/`) — Rendering only. No calculations beyond simple display formatting.

### State Management
- `src/context/` — React contexts for shared state. Keep contexts focused (single responsibility).
- Never mix routing, navigation, or localStorage logic inside data contexts.
- Always memoize context `value` objects with `useMemo` to prevent unnecessary re-renders.

### Shared Utilities
- `src/utils/` — Pure utility functions (formatters, validators, helpers).
- Never define formatting functions inline in components. Always import from `src/utils/`.

---

## Code Style & Patterns

### Functions
- **Max 60 lines** per function. If longer, extract sub-functions.
- **Single Responsibility**: Each function does ONE thing.
- **Pure functions preferred**: Domain logic must be pure (no side effects, no I/O).
- **Consistent signatures**: Related functions should follow the same parameter pattern.

### Constants
- All magic numbers must be named constants in `src/engine/constants.js` or relevant constants file.
- Signal names, thresholds, and scoring weights must be centralized — never hardcoded inline.
- UI presentation constants (colors, labels) are separate from domain constants.

### Naming
- Functions: `verbNoun` (e.g., `computeRiskScore`, `buildRecommendations`).
- Constants: `UPPER_SNAKE_CASE` (e.g., `STRONG_PROFIT_PCT`).
- Components: `PascalCase` (e.g., `StockCard`, `HoldingsTable`).
- Files: `camelCase.js` for utils/services, `PascalCase.jsx` for components.
- Misleading names are bugs. If a function adds a bonus, don't call it `applyPenalty`.

### Error Handling
- Services return `{ data, error }` pattern — never silently swallow errors.
- Components display errors to users, never just `console.error`.
- Use try/catch at service boundaries, not deep inside business logic.

### Bilingual (i18n)
- Business logic must NOT contain translated strings inline.
- Return structured data (keys/params) from domain functions; format strings in the presentation layer or via i18n utilities.
- Exception: `RESEARCH_OVERRIDES` may contain pre-translated strings when sourced from external data.

---

## React Patterns

### Components
- **Max 150 lines** per component file. Extract sub-components if larger.
- Use `useMemo` for expensive computations (data enrichment, filtering, sorting).
- Use `useCallback` for event handlers passed as props.
- Extract reusable UI into `src/components/common/`.

### Custom Hooks
- Extract shared stateful logic into `src/hooks/` (e.g., `useEnrichedHoldings`, `useLivePrices`).
- Hooks must start with `use` prefix.
- Keep hooks focused — one hook per concern.

### Props
- Destructure props in function signature.
- Use `PropTypes` or JSDoc for documenting expected props.

---

## Testing Standards

### Coverage Requirements
- Every engine module (`src/engine/`) must have corresponding tests.
- Every utility (`src/utils/`) must have tests.
- Tests live in `src/__tests__/` mirroring the source structure.

### Test Structure
- Use `describe` blocks grouped by function/module.
- Test names must describe the scenario: `it('penalizes Z-category more for conservative users')`.
- Each test tests ONE behavior.

### Test Categories
Every module should have tests for:
1. **Happy path** — Normal inputs produce expected outputs.
2. **Edge cases** — Zero, null, undefined, empty arrays, boundary values.
3. **Error cases** — Invalid inputs, missing data, network failures.
4. **Regression** — Any bug fix must add a test that would have caught it.

### Test Patterns
```javascript
// Good: Descriptive, focused
it('clamps projected return to [-99%, 500%] when input is Infinity', () => {
  const result = buildRecommendations([item], answers);
  expect(result[0].tentativeReturnPercent).toBeLessThanOrEqual(500);
});

// Bad: Vague, tests multiple things
it('works correctly', () => { ... });
```

### Mocking
- Mock external dependencies (fetch, Firebase), never domain logic.
- Use `vi.fn()` for function mocks, `vi.spyOn()` for partial mocks.

---

## Python Standards (scripts/)

### Functions
- Max 40 lines per function.
- Separate I/O (file reading/writing) from analysis (pure computation).
- Pass dependencies as parameters (e.g., `reference_year`) for testability.

### Testing
- Use `unittest` or `pytest`.
- Test pure analysis functions with various stock profiles.
- Mock HTTP calls, never make real network requests in tests.

### Constants
- Define thresholds and weights at module top level, not inside functions.

---

## File Organization

```
src/
├── __tests__/           # Unit tests
├── components/          # React components (grouped by feature)
│   ├── common/          # Shared UI components
│   ├── Portfolio/       # Portfolio feature
│   ├── Results/         # Results feature
│   └── Wizard/          # Wizard feature
├── context/             # React contexts (single responsibility each)
├── data/                # Static data (i18n, stock definitions)
├── engine/              # Domain logic (pure functions, no I/O)
│   ├── constants.js     # All domain constants & thresholds
│   ├── scorers/         # Individual scoring modules
│   └── suggestion/      # Suggestion strategies
├── hooks/               # Custom React hooks
├── services/            # Data fetching & transformation
└── utils/               # Pure utility functions (formatters, validators)
```

---

## Git Commit Standards
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- Keep commits atomic — one logical change per commit.
- Always run `npx vitest run && npm run build` before committing.
