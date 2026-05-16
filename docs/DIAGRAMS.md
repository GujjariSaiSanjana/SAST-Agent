# System Design Diagrams – SAST Security Copilot

---

## 4.1 System Architecture Diagram

```mermaid
graph TB
    subgraph Client["Client Layer"]
        User["👤 Developer / Security Analyst"]
        Browser["React SPA\n(Vite · Zustand · TanStack Query)"]
    end

    subgraph Backend["Backend Layer  :3001"]
        API["Express REST API"]
        AuthMod["Auth Module\n(Passport · JWT)"]
        ProjMod["Projects Module"]
        ScanMod["Scans Module"]
        IssueMod["Issues Module"]
        Queue["Bull Queue\n(Scan Worker)"]
        AISvc["AI Service\n(Fallback Chain)"]
        AIScan["AI Scanner Service"]
    end

    subgraph AI["AI Provider Layer"]
        NVIDIA["NVIDIA NIM\n(Qwen3-235B)"]
        Gemini["Google Gemini\n1.5 Flash"]
        OpenAI["OpenAI\nGPT-4o-mini"]
    end

    subgraph Infra["Infrastructure Layer"]
        PG[("PostgreSQL 15\n– users\n– projects\n– scans\n– issues")]
        Redis[("Redis 7\nJob Queue")]
        FS["Temp FS\n/tmp/sast-agent"]
    end

    subgraph External["External Services"]
        GitHub["GitHub\nOAuth · Git Clone"]
    end

    User --> Browser
    Browser -- "HTTPS REST" --> API
    API --> AuthMod & ProjMod & ScanMod & IssueMod
    AuthMod -- "OAuth2" --> GitHub
    ScanMod -- "enqueue job" --> Queue
    Queue -- "clone repo / extract ZIP" --> FS
    Queue -- "file-by-file scan" --> AIScan
    AIScan -- "fallback chain" --> AISvc
    AISvc --> NVIDIA & Gemini & OpenAI
    Queue & API --> PG
    Queue -- "job store" --> Redis
    GitHub -- "source code" --> FS
```

---

## 4.2 Data Flow Diagram – Level 0 (Context)

```mermaid
flowchart LR
    Dev(["Developer"])
    GH(["GitHub"])
    AIP(["AI Providers\n(NVIDIA · Gemini · OpenAI)"])

    SAST(["SAST Security Copilot\nSystem"])

    Dev -- "GitHub OAuth login\nSubmit repo URL / ZIP\nView scan results" --> SAST
    SAST -- "Security report\nAI analysis\nRemediation advice" --> Dev

    SAST -- "OAuth handshake\nGit clone request" --> GH
    GH -- "Access token\nSource code" --> SAST

    SAST -- "Code snippet +\nvulnerability context" --> AIP
    AIP -- "Explanation · Impact\nPoC · Fix code\nRemediation" --> SAST
```

---

## 4.3 Data Flow Diagram – Level 1

```mermaid
flowchart TB
    Dev(["Developer"])
    GH(["GitHub"])
    AIP(["AI Providers"])

    P1["1.0\nAuthentication\n& Session"]
    P2["2.0\nProject\nManagement"]
    P3["3.0\nScan\nOrchestration"]
    P4["4.0\nCode\nAnalysis"]
    P5["5.0\nAI Issue\nEnrichment"]
    P6["6.0\nResult\nAggregation"]

    DS1[("D1 Users")]
    DS2[("D2 Projects")]
    DS3[("D3 Scans")]
    DS4[("D4 Issues")]
    DS5[("D5 Redis Queue")]

    Dev -- "GitHub token" --> P1
    P1 -- "OAuth redirect" --> GH
    GH -- "auth code" --> P1
    P1 -- "JWT cookie" --> Dev
    P1 -- "store user" --> DS1

    Dev -- "create/list projects" --> P2
    P2 -- "read/write" --> DS2

    Dev -- "repo URL / ZIP" --> P3
    P3 -- "create scan record" --> DS3
    P3 -- "enqueue job" --> DS5

    DS5 -- "dequeue" --> P4
    P4 -- "clone / unzip" --> GH
    P4 -- "raw findings" --> DS4

    DS4 -- "unprocessed issues" --> P5
    P5 -- "code + vuln context" --> AIP
    AIP -- "AI fields" --> P5
    P5 -- "update ai fields" --> DS4

    DS4 & DS3 --> P6
    P6 -- "report + stats" --> Dev
```

---

## 4.4 Use Case Diagram

```mermaid
flowchart LR
    subgraph Actors
        DEV["👤 Developer"]
        GH["🔗 GitHub"]
        AI["🤖 AI Providers"]
        SYS["⚙️ System\n(Scheduler)"]
    end

    subgraph UseCases["SAST Security Copilot"]
        UC1["Login via GitHub OAuth"]
        UC2["Create Project"]
        UC3["Submit Repo URL Scan"]
        UC4["Upload ZIP Scan"]
        UC5["View Scan History"]
        UC6["View Scan Results"]
        UC7["View Issue Detail"]
        UC8["Request AI Explanation"]
        UC9["Track Scan Progress"]
        UC10["Manage Projects"]

        UC11["Clone Repository"]
        UC12["Analyse Source Files"]
        UC13["Enrich Issue with AI"]
        UC14["Persist Results to DB"]
    end

    DEV --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8 & UC9 & UC10
    UC1 -.includes.-> UC11
    UC3 -.includes.-> UC11
    UC4 -.includes.-> UC12
    UC11 -.includes.-> UC12
    UC12 -.includes.-> UC13
    UC13 -.includes.-> UC14
    UC8 -.includes.-> UC13

    GH --- UC1
    GH --- UC11
    AI --- UC13
    SYS --- UC12 & UC13
```

---

## 4.5 Activity Diagram

```mermaid
flowchart TD
    Start([Start: User submits scan])
    A["Create Scan record\nstatus = PENDING"]
    B["Enqueue job\n→ Redis Bull Queue"]
    C{"Source type?"}
    D1["Clone GitHub repo\nstatus = CLONING"]
    D2["Extract ZIP archive\nstatus = CLONING"]
    E["Validate file tree\nstatus = SCANNING"]
    F{"More files?"}
    G["Read source file"]
    H{"File size >\n60 KB or empty?"}
    I["Skip file"]
    J["Call AI Provider\n(NVIDIA → Gemini → OpenAI)"]
    K{"AI responded?"}
    L["Log: all providers failed"]
    M["Persist findings\nto issues table"]
    N["Delay 1.5 s\n(rate limit)"]
    O["Batch AI enrichment\nstatus = AI_ANALYSIS"]
    P["Compute risk score\nUpdate scan counters"]
    Q["status = COMPLETED"]
    R["status = FAILED\nStore errorMsg"]
    End([End])

    Start --> A --> B --> C
    C -- GitHub URL --> D1
    C -- ZIP upload --> D2
    D1 & D2 --> E --> F
    F -- Yes --> G --> H
    H -- Yes --> I --> N
    H -- No --> J --> K
    K -- Yes --> M --> N
    K -- No --> L --> N
    N --> F
    F -- No --> O --> P --> Q --> End
    D1 & D2 & E & J -- Error --> R --> End
```

---

## 4.6 Class Diagram

```mermaid
classDiagram
    class User {
        +String id
        +String? githubId
        +String username
        +String? email
        +String? avatarUrl
        +DateTime createdAt
        +DateTime updatedAt
        +Project[] projects
        +Scan[] scans
    }

    class Project {
        +String id
        +String name
        +String? repoUrl
        +String? description
        +String userId
        +DateTime createdAt
        +DateTime updatedAt
        +Scan[] scans
    }

    class Scan {
        +String id
        +ScanStatus status
        +ScanSource source
        +String inputRef
        +Float riskScore
        +Int totalIssues
        +Int criticalCount
        +Int highCount
        +Int mediumCount
        +Int lowCount
        +Int warningCount
        +Int? duration
        +String? errorMsg
        +String userId
        +String? projectId
        +Issue[] issues
    }

    class Issue {
        +String id
        +String ruleId
        +String title
        +String description
        +Severity severity
        +String category
        +String filePath
        +Int lineStart
        +Int lineEnd
        +String? codeSnippet
        +String? cweId
        +String? owaspId
        +Float? cvssScore
        +String? aiExplanation
        +String? aiImpact
        +String? aiProofOfConcept
        +String? aiRemediation
        +String? aiFixCode
        +Boolean aiProcessed
        +String scanId
    }

    class AuthService {
        +generateToken(user) String
        +getUserWithStats(userId) Object
    }

    class ScanService {
        +list(userId, limit, skip)
        +getSummary(id, userId)
        +getIssues(scanId, userId, limit, skip)
        +startScan(userId, repoUrl, projectId?)
        +startZipScan(userId, filePath, projectId?)
        +subscribeToScan(scanId, userId, onProgress)
    }

    class AiService {
        -AiProvider[] providers
        +getProviders() AiProvider[]
        +analyzeIssue(issue) AiAnalysisResult
        +processScanIssues(scanId) void
    }

    class AiScannerService {
        -AiProvider[] providers
        +scan(targetDir, scanId, onFindings?) AiScanFinding[]
        -scanFileWithFallback(filePath, content) AiScanFinding[]
        -getRelevantFiles(dir) String[]
    }

    class IssueService {
        +list(userId, limit, offset)
        +get(id, userId)
        +explain(id, userId)
    }

    class AiProvider {
        <<interface>>
        +String name
        +scan(filePath, content) AiScanFinding[]
        +analyze(issue) AiAnalysisResult
    }

    class NvidiaProvider {
        +String name
        +scan(filePath, content)
        +analyze(issue)
    }

    class GeminiProvider {
        +String name
        +scan(filePath, content)
        +analyze(issue)
    }

    class OpenAIProvider {
        +String name
        +scan(filePath, content)
        +analyze(issue)
    }

    User "1" --> "many" Project
    User "1" --> "many" Scan
    Project "1" --> "many" Scan
    Scan "1" --> "many" Issue
    ScanService --> AiScannerService
    AiScannerService --> AiProvider
    AiService --> AiProvider
    AiProvider <|.. NvidiaProvider
    AiProvider <|.. GeminiProvider
    AiProvider <|.. OpenAIProvider
    IssueService --> AiService
```

---

## 4.7 Sequence Diagram

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant FE as React Frontend
    participant BE as Express Backend
    participant GH as GitHub OAuth
    participant DB as PostgreSQL
    participant RQ as Redis Queue
    participant AI as AI Providers

    Note over Dev, AI: — GitHub OAuth Login Flow —
    Dev->>FE: Click "Login with GitHub"
    FE->>BE: GET /auth/github
    BE->>GH: Redirect to OAuth authorize
    Dev->>GH: Approve permissions
    GH->>BE: GET /auth/github/callback?code=xxx
    BE->>GH: Exchange code for access_token
    BE->>DB: Upsert user record
    BE->>FE: Redirect /dashboard + Set JWT cookie
    FE->>BE: GET /auth/me (JWT cookie)
    BE->>DB: Fetch user + stats
    BE-->>FE: User object

    Note over Dev, AI: — Repo Scan Flow —
    Dev->>FE: Submit GitHub repo URL
    FE->>BE: POST /api/scans {repoUrl}
    BE->>DB: INSERT scan (status=PENDING)
    BE->>RQ: scanQueue.add(job)
    BE-->>FE: {scanId, status: PENDING}
    FE->>BE: SSE /api/scans/:id/stream (poll 1s)

    RQ->>RQ: Dequeue job
    RQ->>GH: git clone repoUrl
    RQ->>DB: UPDATE scan status=CLONING
    GH-->>RQ: Source code files
    RQ->>DB: UPDATE scan status=SCANNING

    loop For each source file
        RQ->>AI: NVIDIA: analyze(file, content)
        alt NVIDIA succeeds
            AI-->>RQ: findings[]
        else NVIDIA fails → Gemini
            RQ->>AI: Gemini: analyze(file, content)
            AI-->>RQ: findings[]
        else Gemini fails → OpenAI
            RQ->>AI: OpenAI: analyze(file, content)
            AI-->>RQ: findings[]
        end
        RQ->>DB: INSERT issues (raw findings)
    end

    RQ->>DB: UPDATE scan status=AI_ANALYSIS
    loop Batch enrich issues (batch=5, concurrency=2)
        RQ->>AI: analyze(issue for explanation/poc/fix)
        AI-->>RQ: AiAnalysisResult
        RQ->>DB: UPDATE issue (aiExplanation, aiRemediation, aiFixCode)
    end

    RQ->>DB: UPDATE scan status=COMPLETED + riskScore
    BE-->>FE: {status: COMPLETED, totalIssues, riskScore}
    FE->>Dev: Display results dashboard
```

---

## 4.8 Collaboration Diagram

```mermaid
flowchart LR
    subgraph "Scan Initiation"
        SC["ScanController\n:scanController"]
        SS["ScanService\n:scanService"]
        DB1["Prisma\n:prisma"]
        BQ["Bull Queue\n:scanQueue"]
    end

    subgraph "Queue Worker"
        QW["Queue Worker\n:scanProcessor"]
        GIT["SimpleGit\n:simpleGit"]
        ZIP["Unzipper\n:unzipper"]
        AIS["AiScannerService\n:aiScanner"]
    end

    subgraph "AI Layer"
        AISV["AiService\n:aiService"]
        NV["NvidiaProvider\n:nvidia"]
        GM["GeminiProvider\n:gemini"]
        OA["OpenAIProvider\n:openai"]
    end

    subgraph "Issue Enrichment"
        IS["IssueService\n:issueService"]
        DB2["Prisma\n:prisma"]
    end

    SC -- "1: startScan(userId, repoUrl)" --> SS
    SS -- "2: create(scan)" --> DB1
    SS -- "3: add(jobData)" --> BQ
    BQ -- "4: process(job)" --> QW
    QW -- "5a: clone(repoUrl)" --> GIT
    QW -- "5b: parse(zipFile)" --> ZIP
    QW -- "6: scan(targetDir, scanId)" --> AIS
    AIS -- "7: scanFileWithFallback(file, content)" --> AISV
    AISV -- "8a: scan(file, content)" --> NV
    AISV -- "8b: scan(file, content)" --> GM
    AISV -- "8c: scan(file, content)" --> OA
    QW -- "9: processScanIssues(scanId)" --> IS
    IS -- "10: analyzeIssue(issue)" --> AISV
    IS -- "11: update(issue, aiFields)" --> DB2
```

---

## 4.9 Component Diagram

```mermaid
flowchart TB
    subgraph FrontendApp["Frontend Application"]
        Router["React Router\n(Route Guard)"]
        Pages["Pages\n(Dashboard · Scans · Projects · Login)"]
        Components["UI Components\n(shadcn/ui · Recharts · Monaco)"]
        AuthStore["Auth Store\n(Zustand)"]
        ApiClient["API Client\n(Axios + Interceptors)"]
    end

    subgraph BackendApp["Backend Application"]
        HTTPServer["Express HTTP Server\n(Helmet · CORS · Compression)"]
        RateLimiter["Rate Limiter\n(express-rate-limit)"]
        AuthMiddle["Auth Middleware\n(passport-jwt)"]

        subgraph Modules
            AuthRoute["Auth Routes\n+ Controller"]
            ProjRoute["Projects Routes\n+ Controller + Service"]
            ScanRoute["Scans Routes\n+ Controller + Service"]
            IssueRoute["Issues Routes\n+ Controller + Service"]
        end

        subgraph QueueSystem["Queue System"]
            BullQueue["Bull Queue\n(scan-queue)"]
            ScanWorker["Scan Processor\n(clone · extract · analyse)"]
        end

        subgraph AISystem["AI System"]
            AiSvc["AI Service\n(fallback chain)"]
            AiScanner["AI Scanner Service\n(file walker)"]
            NVProv["NVIDIA Provider"]
            GmProv["Gemini Provider"]
            OAProv["OpenAI Provider"]
        end

        PrismaClient["Prisma Client\n(ORM)"]
        Logger["Winston Logger"]
    end

    subgraph DataStores["Data Stores"]
        PG[("PostgreSQL 15")]
        RD[("Redis 7")]
    end

    subgraph ExternalSvc["External Services"]
        GitHubOAuth["GitHub OAuth"]
        GitHubGit["GitHub Git"]
        NvidiaAPI["NVIDIA NIM API"]
        GeminiAPI["Google Gemini API"]
        OpenAIAPI["OpenAI API"]
    end

    ApiClient --> HTTPServer
    HTTPServer --> RateLimiter --> AuthMiddle --> Modules
    AuthRoute --> GitHubOAuth
    ScanRoute --> BullQueue
    BullQueue --> ScanWorker
    ScanWorker --> GitHubGit
    ScanWorker --> AiScanner
    AiScanner --> AiSvc
    AiSvc --> NVProv & GmProv & OAProv
    NVProv --> NvidiaAPI
    GmProv --> GeminiAPI
    OAProv --> OpenAIAPI
    Modules & ScanWorker --> PrismaClient --> PG
    BullQueue --> RD
    Router --> Pages --> Components
    AuthStore --> ApiClient
```

---

## 4.10 Deployment Diagram

```mermaid
flowchart TB
    subgraph Host["Host Machine (Linux)"]
        subgraph DockerNetwork["Docker Network: major-sast-agent_default"]

            subgraph FEContainer["Container: frontend\nImage: major-sast-agent-frontend\nnginx:1.27-alpine"]
                Nginx["nginx\nPort 80 (internal)"]
                StaticDist["dist/\n(React SPA)"]
                NginxConf["nginx.conf\n(SPA fallback)"]
            end

            subgraph BEContainer["Container: backend\nImage: major-sast-agent-backend\nnode:20-alpine (runner)"]
                NodeProc["node dist/index.js\nPort 3001 (internal)"]
                Bearer["Bearer CLI\n/usr/local/bin/bearer"]
                TempVol["Volume: scan_data\n/tmp/sast-agent"]
            end

            subgraph PGContainer["Container: postgres\nImage: postgres:15-alpine"]
                PGProc["postgres\nPort 5432 (internal)"]
                PGVol["Volume: pg_data\n/var/lib/postgresql/data"]
            end

            subgraph RDContainer["Container: redis\nImage: redis:7-alpine"]
                RDProc["redis-server\nPort 6379 (internal)"]
            end
        end

        HostPort5173["Host Port 5173"]
        HostPort3001["Host Port 3001"]
        HostPort5432["Host Port 5432"]
        HostPort6379["Host Port 6379"]
    end

    Browser["User Browser"]

    Browser -- "HTTP :5173" --> HostPort5173
    HostPort5173 -- "80" --> Nginx
    Nginx --> StaticDist

    Browser -- "REST API :3001" --> HostPort3001
    HostPort3001 -- "3001" --> NodeProc

    HostPort5432 -- "5432" --> PGProc
    HostPort6379 -- "6379" --> RDProc

    NodeProc -- "TCP 5432" --> PGProc
    NodeProc -- "TCP 6379" --> RDProc
    NodeProc -- "exec" --> Bearer
    NodeProc -- "R/W" --> TempVol
    PGProc --> PGVol
```

---

## 4.11 State Chart Diagram

```mermaid
stateDiagram-v2
    [*] --> PENDING : User submits scan\n(GitHub URL or ZIP)

    PENDING --> CLONING : Bull Queue dequeues job

    CLONING --> SCANNING : Repo cloned / ZIP extracted\nto /tmp/sast-agent/{scanId}

    CLONING --> FAILED : git clone error\nOR ZIP extract error\nOR timeout

    SCANNING --> PROCESSING : AI Scanner walks\nall source files\n(findings stored to DB)

    SCANNING --> FAILED : Unhandled exception\nin file walker

    PROCESSING --> AI_ANALYSIS : Raw findings saved\nBegin batch AI enrichment\n(explanation · PoC · fix)

    PROCESSING --> FAILED : DB write error

    AI_ANALYSIS --> COMPLETED : All issues enriched\nriskScore computed\ntimestamps updated

    AI_ANALYSIS --> COMPLETED : Partial failure tolerated\n(some providers exhausted)

    AI_ANALYSIS --> FAILED : Critical DB failure

    FAILED --> [*] : Job removed\nerrorMsg persisted

    COMPLETED --> [*] : Results available\nto user

    note right of PENDING
        Scan record created in DB
        inputRef = repoUrl or filename
    end note

    note right of SCANNING
        AI Scanner uses fallback chain:
        NVIDIA → Gemini → OpenAI
        1.5s delay between files
    end note

    note right of AI_ANALYSIS
        Batch size = 5
        Concurrency = 2
        Updates: aiExplanation, aiImpact,
        aiProofOfConcept, aiRemediation,
        aiFixCode, aiProcessed
    end note
```
