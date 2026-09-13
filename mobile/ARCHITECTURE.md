# EasyMeter Mobile — Architecture Plan (Phase 1)

Status: **scaffolding only, no features implemented.** This document is the basis for approval before Phase 2 (feature implementation) begins.

## 1. Source of truth: the web app

The web app (`../src`) is React + TypeScript + Vite, PWA-wrapped with Capacitor for an existing
Android build. Its logic splits cleanly into:

- **Pure business logic** (framework-independent): `src/lib/calc.ts`, `src/lib/billStatus.ts`,
  `src/lib/analytics.ts`, `src/lib/types.ts` (including the `TSSPDCL_DOMESTIC_2025_26` tariff
  constant). These contain the actual billing math and have unit tests (`*.test.ts`).
- **Persistence**: `src/lib/storage.ts` — localStorage is the source of truth; `src/lib/firebase.ts`
  provides optional, best-effort Firestore sync when `VITE_FIREBASE_*` env vars are configured.
- **UI**: `src/pages/*`, `src/components/*` — React/Tailwind, not portable as-is.

**Consistency strategy:** rather than re-deriving the billing formulas by reading React code under
time pressure, the Dart port of `calc.ts`/`billStatus.ts`/`types.ts` will be written as a direct,
line-by-line translation, and the existing `vitest` test cases (`calc.test.ts`, `billStatus.test.ts`,
`analytics.test.ts`) will be ported to Dart `test/domain/` as golden cases — same inputs, same
expected outputs — so both codebases can be verified against identical numbers. The two
implementations are not literally shared (no code generation from TS to Dart), because keeping
them independent-but-cross-tested is far safer than a build-time bridge, and this is a native
Flutter app, not a WebView wrapper. If the web app's tariff logic changes later, the Dart tests
should be re-run against the same fixtures to catch drift.

## 2. Chosen stack

| Concern | Choice | Rationale |
|---|---|---|
| State management | Riverpod (`flutter_riverpod`) | Compile-safe DI, testable providers, no BuildContext threading |
| Routing | `go_router` | Declarative, mirrors the web's flat route list |
| Local persistence | `drift` (SQLite) for Bills/Tenants, `shared_preferences` for TariffConfig/theme | Web's `Bill`↔`Tenant` link is a bare name string (a schema smell called out in the analysis); a relational DB lets the mobile app fix this with a real foreign key while still supporting the same queries (per-tenant history, monthly aggregates) |
| Immutable models | `freezed` + `json_serializable` | Matches "strong type safety" requirement; gives `copyWith`/equality/JSON for free, needed for backup import/export parity with `BackupPayload` |
| Cloud sync (optional) | `firebase_auth` + `cloud_firestore` + `google_sign_in` | Mirrors the web's optional Google-sign-in + Firestore backup; local DB stays source of truth, sync is best-effort, same as web |
| PDF generation | `pdf` + `printing` | Replaces the web's screenshot-based `html2canvas` + `jsPDF` hack with a native, crisp, data-driven PDF built directly from `Bill`/`BillCalculation` |
| Sharing | `share_plus` + `url_launcher` | Native share sheet (PDF) and WhatsApp deep link (`wa.me`), replacing `navigator.share` |
| Charts | `fl_chart` | Replaces `recharts` for the Analytics/History screen |

## 3. Folder structure

```
mobile/
├── lib/
│   ├── main.dart                    # entry point (placeholder MaterialApp for now)
│   ├── app.dart                     # [Phase 2] MaterialApp.router + theme wiring
│   ├── core/
│   │   ├── constants/               # route names, storage keys, tariff year constant
│   │   ├── theme/                   # light/dark ThemeData — ports index.css design tokens
│   │   ├── utils/                   # formatMoney/formatUnits/date helpers (port of calc.ts helpers)
│   │   ├── errors/                  # Failure/Exception types for repository error handling
│   │   └── router/                  # go_router route table (mirrors src/App.tsx routes)
│   ├── domain/                      # pure Dart, zero Flutter/UI imports
│   │   ├── entities/                # Tenant, Bill, TariffConfig, BillCalculation, Slab,
│   │   │                            # ExtraCharge, SlabBreakdown, DomesticCategoryTariff —
│   │   │                            # 1:1 port of src/lib/types.ts
│   │   ├── repositories/            # abstract TenantRepository, BillRepository, TariffRepository
│   │   └── usecases/                # CalculateBill, GetBillStatus (port of calc.ts/billStatus.ts),
│   │                                # GetMonthlyAnalytics (port of analytics.ts),
│   │                                # GenerateNextStatement, ExportBackup/ImportBackup
│   ├── data/
│   │   ├── local/                   # drift database + tables/DAOs for bills/tenants,
│   │   │                            # shared_preferences wrapper for tariff config
│   │   ├── remote/                  # FirebaseAuthService, FirestoreSyncService (port of firebase.ts)
│   │   ├── models/                  # JSON (de)serialization + BackupPayload
│   │   └── repositories_impl/       # concrete repos: local-first read/write, async best-effort
│   │                                # Firestore push, same pattern as storage.ts
│   ├── features/                    # one folder per screen-group, each split into
│   │   │                            # presentation/ (screens+widgets) and application/ (Riverpod
│   │   │                            # controllers/notifiers) — keeps UI and state separate
│   │   ├── dashboard/                → Index.tsx (stats cards, activity feed)
│   │   ├── tenants/                  → Tenants.tsx + TenantHistory.tsx
│   │   ├── meter_readings/           → the reading-entry + rollover-toggle portion of NewBill.tsx,
│   │   │                                factored out so it's reusable from both "new bill" and
│   │   │                                "generate next statement" flows
│   │   ├── billing/                  → NewBill.tsx, BillDetail.tsx, BillView.tsx, PDF export/share
│   │   ├── history/                  → Analytics.tsx (trends, leaderboard)
│   │   └── settings/                 → Tariff.tsx (slab editor), theme toggle, backup export/import
│   └── shared/
│       ├── widgets/                  # StatCard, PaymentStatusPill, AppShell/BottomNav, EmptyState
│       └── state/                    # cross-feature providers (auth state, current theme)
├── test/
│   ├── domain/                       # ported calc.test.ts/billStatus.test.ts/analytics.test.ts cases
│   └── widget/                       # widget tests
├── assets/
│   ├── images/
│   └── fonts/
└── pubspec.yaml
```

This is the structure suggested in the brief, extended with `domain/repositories`,
`domain/usecases`, `data/local`/`data/remote`/`data/repositories_impl`, and a
`presentation`/`application` split inside each feature — needed because the web app has real
persistence and sync logic (not just UI) that must land somewhere in a clean-architecture layout.

## 4. Feature-by-feature migration plan

| Web feature | Web source | Mobile destination | Notes |
|---|---|---|---|
| Dashboard | `pages/Index.tsx` | `features/dashboard/` | Stats cards + activity feed rebuilt as native widgets; data via `BillRepository` + `TenantRepository` streams |
| Tenant CRUD | `pages/Tenants.tsx`, `storage.ts` | `features/tenants/` | Dialog → full-screen/bottom-sheet form; `Tenant` gets a real DB row, `Bill.tenantId` FK replaces the web's name-string link (back-compat import path still matches by name for legacy backups) |
| Tenant history | `pages/TenantHistory.tsx` | `features/tenants/presentation/screens/tenant_history_screen.dart` | Same aggregate stats, sourced from local DB query instead of full-array filtering |
| Meter reading entry / rollover | `pages/NewBill.tsx` (reading fields) | `features/meter_readings/` | Extracted as a reusable widget + validator so both "new bill" and "next statement" flows share it, unlike the web's single monolithic page |
| Billing calculation | `lib/calc.ts`, `lib/types.ts` (tariff constant) | `domain/entities/`, `domain/usecases/calculate_bill.dart` | Direct line-by-line port; cross-tested against the same fixtures as `calc.test.ts` |
| Bill create/edit | `pages/NewBill.tsx` | `features/billing/presentation/screens/new_bill_screen.dart` | Live preview pane ported using the same `CalculateBill` usecase, called on every keystroke via Riverpod |
| Bill detail + status | `pages/BillDetail.tsx`, `lib/billStatus.ts` | `features/billing/presentation/screens/bill_detail_screen.dart` | Paid/pending/overdue pill ported as a `shared/widgets` component |
| Bill view / receipt layout | `components/BillView.tsx` | `features/billing/presentation/widgets/bill_view.dart` | Rebuilt as a Flutter widget tree (for on-screen display) **and** as a `pdf` package layout (for export) — both driven from the same `Bill` data, no screenshot step |
| PDF export / share | `lib/share.ts` | `features/billing/application/bill_export_service.dart` | `printing`/`pdf` build the PDF natively; `share_plus` opens the OS share sheet; WhatsApp text-share ported via `url_launcher` to `wa.me` |
| Billing history / analytics | `pages/Analytics.tsx`, `lib/analytics.ts` | `features/history/` | `analytics.ts` aggregation functions ported 1:1 into `domain/usecases`; charts rebuilt with `fl_chart` |
| Tariff / settings | `pages/Tariff.tsx` | `features/settings/` | Slab editor rebuilt natively; also exposes `fixedCharge`/`extras`/`lateFeePerDay` fields already in `TariffConfig` but not fully surfaced in the current web UI |
| Auth (Google sign-in) | `lib/auth.tsx`, `lib/firebase.ts` | `data/remote/firebase_auth_service.dart`, `shared/state/auth_provider.dart` | Optional, same as web — app fully usable signed-out |
| Backup import/export | `storage.ts` (`exportBackup`/`importBackup`) | `domain/usecases/export_backup.dart`, `import_backup.dart` | Surfaced in Settings; JSON shape kept compatible with the web's `BackupPayload` so backups are portable between platforms |
| Data persistence | `localStorage` + Firestore | `drift` (SQLite) + `shared_preferences` + optional Firestore | Local DB is always the source of truth; Firestore sync is best-effort background push/pull, matching the web's design |

## 5. Non-functional requirements (tracked, not yet implemented)

- **Type safety**: `freezed` models, no `dynamic`/untyped JSON outside the `data/models` boundary.
- **State management**: Riverpod providers per feature, no global mutable singletons.
- **Validation**: web's ad-hoc `validationError()` functions get ported as typed, unit-testable
  validators in `domain/usecases` or feature-local validators — not left as inline widget code.
- **Offline-first**: local DB is authoritative; Firestore sync is additive, matching web behavior.
- **Theming**: light/dark `ThemeData` derived from the web's `index.css` design tokens.
- **Testing**: `test/domain` ports the existing `vitest` suites as the first tests written.

## 6. What's intentionally deferred to Phase 2

No screens, widgets, database schema, or business logic have been implemented yet — only the
package manifest, lint config, and empty folder scaffold exist. `android/` and `ios/` platform
projects are not yet generated (this machine has no Flutter SDK installed); running
`flutter create .` from `mobile/` once Flutter is installed will generate them without disturbing
the `lib/` structure above.
