
This represents the exact file structure of the **Pulse-Field Suite** web application, incorporating the modifications, additions, and new feature files established throughout our planning and implementation:

```text
pulse-field-suite/
└── apps/
    ├── backend/                    # Rust / Axum Monolith Backend
    ├── packages/
    │   └── shared-types/           # Auto-generated TypeScript types from rust (ts-rs)
    └── web/                        # React / Vite Frontend
        ├── dist/
        ├── node_modules/
        ├── src/
        │   ├── features/           # Encapsulated, domain-driven feature modules
        │   │   ├── auth/           # RBAC Access control
        │   │   │   ├── LoginPage.tsx
        │   │   │   └── ProtectedRoute.tsx
        │   │   ├── home/           # Executive command dashboard
        │   │   │   └── Home.tsx
        │   │   ├── inbox/          # Internal messaging hub
        │   │   │   └── Inbox.tsx
        │   │   ├── audit_logs/     # Read-only compliance timeline
        │   │   │   └── AuditLogs.tsx
        │   │   ├── settings/       # Profile configuration & native JWT decoder
        │   │   │   └── Settings.tsx
        │   │   ├── impact/         # Google Drive photographic outcome gallery
        │   │   │   └── ImpactGallery.tsx
        │   │   ├── placeholder/
        │   │   │   └── PlaceholderPage.tsx
        │   │   └── projects/       # PM workspaces, budget bars, and AI planning
        │   │       ├── ProjectsList.tsx
        │   │       ├── BudgetStatusBar.tsx
        │   │       ├── ProjectDashboard.tsx
        │   │       ├── NewTaskModal.tsx
        │   │       ├── CreateProjectModal.tsx
        │   │       └── AIPhaseGenerator.tsx
        │   ├── layout/             # Main global layout container and nav engines
        │   │   ├── MainLayout.tsx
        │   │   ├── Sidebar.tsx     # Corrected navigation focus parameters
        │   │   ├── TabEngine.tsx   # Dynamic horizontal contexts
        │   │   └── TopNav.tsx      # Dark mode & alert headers
        │   ├── lib/
        │   │   └── api.ts          # Axios setup pointing to proxied /api
        │   ├── App.tsx             # Main routing configuration & TanStack Query wrapper
        │   ├── index.css           # Global Tailwind declarations & scroll overrides
        │   └── main.tsx            # DOM mounting entrypoint
        ├── index.html
        ├── package.json
        ├── postcss.config.js
        ├── tailwind.config.js
        ├── tsconfig.json
        └── vite.config.ts          # Corrected proxy config pointing to :8080
```

## How to run
1. First configure the database
to create and run the database in docker 
```bash
docker run --name pulse-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=pulse_field \
  -p 5432:5432 \
  -d postgres
```

```bash
docker start pulse_field
```

to check running in docker
```docker
docker ps
```

2. Second run the backend
   ```bash
   cd app/backend/
   ```
   create the database schematic and populate with some data
   ```bash
   sqlx migrate
   ```
   to run the backend
   ```bash
   cargo run
   ```

