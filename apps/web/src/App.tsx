import { CircleCheck, Database, LogOut, Plus, Server, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Brand } from "./components/Brand";
import { Button } from "./components/Button";
import { PasswordForm } from "./components/PasswordForm";
import {
  createDatabaseConnection,
  deleteDatabaseConnection,
  getAuthState,
  listDatabases,
  login,
  logout,
  setup,
  testDatabaseConnection,
  type AuthState,
  type DatabaseConnection,
  type DatabaseConnectionInput,
  type DatabaseType
} from "./lib/api";

type Route = "loading" | "setup" | "login" | "databases" | "database-detail";

function routeFromPath(state: AuthState | null): Route {
  if (!state) return "loading";
  if (state.setupRequired) return "setup";
  if (!state.authenticated) return "login";

  const path = window.location.pathname;

  if (path.startsWith("/databases/")) {
    return "database-detail";
  }

  return "databases";
}

export function App() {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [path, setPath] = useState(window.location.pathname);
  const route = useMemo(() => routeFromPath(authState), [authState, path]);

  useEffect(() => {
    getAuthState().then(setAuthState).catch(() => setAuthState({ setupRequired: false, authenticated: false }));
  }, []);

  useEffect(() => {
    function onPopState() {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPath: string) {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }

  async function handleLogout() {
    await logout();
    setAuthState({ setupRequired: false, authenticated: false });
    navigate("/login");
  }

  if (route === "loading") {
    return (
      <div className="page">
        <Header />
        <main className="loading-state">Loading Debby...</main>
      </div>
    );
  }

  if (route === "setup") {
    return (
      <div className="page">
        <Header />
        <PasswordForm
          mode="setup"
          submitLabel="Create password"
          onSubmit={async (password) => {
            const nextState = await setup(password);
            setAuthState(nextState);
            navigate("/databases");
          }}
        />
      </div>
    );
  }

  if (route === "login") {
    return (
      <div className="page">
        <Header />
        <PasswordForm
          mode="login"
          submitLabel="Sign in"
          onSubmit={async (password) => {
            const nextState = await login(password);
            setAuthState(nextState);
            navigate("/databases");
          }}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <Header authenticated onLogout={handleLogout} />
      {route === "database-detail" ? <DatabaseDetail path={path} /> : <DatabasesPage />}
    </div>
  );
}

function Header({
  authenticated = false,
  onLogout
}: {
  authenticated?: boolean;
  onLogout?: () => void;
}) {
  return (
    <header className="site-header">
      <Brand />
      <nav>
        {authenticated ? (
          <button className="nav-button" type="button" onClick={onLogout}>
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        ) : null}
      </nav>
    </header>
  );
}

function DatabasesPage() {
  const [databaseModalOpen, setDatabaseModalOpen] = useState(false);
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refreshDatabases() {
    setError("");

    try {
      const response = await listDatabases();
      setDatabases(response.databases);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load databases.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshDatabases();
  }, []);

  async function handleDeleteDatabase(id: string) {
    await deleteDatabaseConnection(id);
    setDatabases((current) => current.filter((database) => database.id !== id));
  }

  return (
    <main className="dashboard">
      <section className="dashboard-hero">
        <div>
          <h1>Databases</h1>
        </div>
        <Button type="button" onClick={() => setDatabaseModalOpen(true)}>
          <Plus size={15} />
          <span>Add database</span>
        </Button>
      </section>

      {error ? <p className="page-error">{error}</p> : null}

      {loading ? <section className="empty-state"><h2>Loading databases.</h2></section> : null}

      {!loading && databases.length === 0 ? (
        <section className="empty-state">
          <div>
            <h2>No saved databases created.</h2>
          </div>
        </section>
      ) : null}

      {databases.length > 0 ? (
        <section className="saved-database-grid">
          {databases.map((database) => (
            <DatabaseConnectionCard
              database={database}
              key={database.id}
              onDelete={() => void handleDeleteDatabase(database.id)}
            />
          ))}
        </section>
      ) : null}

      {databaseModalOpen ? (
        <DatabaseTypeModal
          onClose={() => setDatabaseModalOpen(false)}
          onSaved={(database) => {
            setDatabases((current) => [database, ...current]);
            setDatabaseModalOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}

function DatabaseConnectionCard({
  database,
  onDelete
}: {
  database: DatabaseConnection;
  onDelete: () => void;
}) {
  const icon = databaseTypes.find((type) => type.type === database.type)?.icon ?? "/database-icons/postgresql.svg";
  const href = `/databases/${database.id}`;

  return (
    <article className="saved-database-card">
      <a href={href}>
        <span className="database-type-icon">
          <img alt="" src={icon} />
        </span>
        <span>
          <strong>{database.name}</strong>
          <small>
            {database.username}@{database.host}:{database.port}/{database.databaseName}
          </small>
        </span>
      </a>
      <div className="saved-database-footer">
        <span className={`connection-status connection-status-${database.lastStatus ?? "unknown"}`}>
          {database.lastStatus ?? "untested"}
        </span>
        <button aria-label={`Delete ${database.name}`} type="button" onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}

const databaseTypes = [
  {
    name: "PostgreSQL",
    icon: "/database-icons/postgresql.svg",
    type: "postgres",
    defaultPort: 5432
  },
  {
    name: "MySQL",
    icon: "/database-icons/mysql.svg",
    type: "mysql",
    defaultPort: 3306
  },
  {
    name: "MariaDB",
    icon: "/database-icons/mariadb.svg",
    type: "mysql",
    defaultPort: 3306
  },
  {
    name: "SQLite",
    icon: "/database-icons/sqlite.svg"
  },
  {
    name: "MongoDB",
    icon: "/database-icons/mongodb.svg"
  },
  {
    name: "Redis",
    icon: "/database-icons/redis.svg"
  }
];

type DatabaseTypeOption = (typeof databaseTypes)[number];

function DatabaseTypeModal({
  onClose,
  onSaved
}: {
  onClose: () => void;
  onSaved: (database: DatabaseConnection) => void;
}) {
  const [selectedType, setSelectedType] = useState<DatabaseTypeOption | null>(null);
  const [notice, setNotice] = useState("");

  function handleSelect(databaseType: DatabaseTypeOption) {
    setNotice("");

    if (!("type" in databaseType)) {
      setNotice(`${databaseType.name} support is not wired yet.`);
      return;
    }

    setSelectedType(databaseType);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="database-modal-title"
        aria-modal="true"
        className="modal-panel"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
        >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Add database</p>
            <h2 id="database-modal-title">
              {selectedType ? `Configure ${selectedType.name}.` : "Select a database type."}
            </h2>
          </div>
          <button aria-label="Close modal" className="icon-button" type="button" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        {selectedType && "type" in selectedType ? (
          <DatabaseConnectionForm
            databaseType={selectedType}
            onBack={() => setSelectedType(null)}
            onSaved={onSaved}
          />
        ) : (
          <>
            {notice ? <p className="modal-notice">{notice}</p> : null}
            <div className="database-type-list">
              {databaseTypes.map((databaseType) => (
                <button
                  className="database-type-option"
                  key={databaseType.name}
                  type="button"
                  onClick={() => handleSelect(databaseType)}
                >
                  <span className="database-type-icon">
                    <img alt="" src={databaseType.icon} />
                  </span>
                  <span className="database-type-copy">
                    <strong>{databaseType.name}</strong>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function DatabaseConnectionForm({
  databaseType,
  onBack,
  onSaved
}: {
  databaseType: DatabaseTypeOption & { type: DatabaseType; defaultPort: number };
  onBack: () => void;
  onSaved: (database: DatabaseConnection) => void;
}) {
  const [form, setForm] = useState<DatabaseConnectionInput>({
    type: databaseType.type,
    name: databaseType.name,
    host: "localhost",
    port: databaseType.defaultPort,
    databaseName: "",
    username: "",
    password: "",
    sslEnabled: false
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"test" | "save" | null>(null);

  function updateForm<Value extends string | number | boolean>(
    key: keyof DatabaseConnectionInput,
    value: Value
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleTest() {
    setError("");
    setMessage("");
    setLoading("test");

    try {
      await testDatabaseConnection(form);
      setMessage("Connection successful.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection failed.");
    } finally {
      setLoading(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading("save");

    try {
      const response = await createDatabaseConnection(form);
      onSaved(response.database);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save database.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <form className="connection-form" onSubmit={handleSubmit}>
      <div className="connection-form-grid">
        <label className="field">
          <span>Name</span>
          <input
            required
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Host</span>
          <input
            required
            value={form.host}
            onChange={(event) => updateForm("host", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Port</span>
          <input
            required
            min={1}
            max={65535}
            type="number"
            value={form.port}
            onChange={(event) => updateForm("port", Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Database</span>
          <input
            required
            value={form.databaseName}
            onChange={(event) => updateForm("databaseName", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Username</span>
          <input
            required
            value={form.username}
            onChange={(event) => updateForm("username", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            required
            type="password"
            value={form.password}
            onChange={(event) => updateForm("password", event.target.value)}
          />
        </label>
      </div>

      <label className="check-field">
        <input
          checked={form.sslEnabled}
          type="checkbox"
          onChange={(event) => updateForm("sslEnabled", event.target.checked)}
        />
        <span>Use SSL</span>
      </label>

      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="connection-form-actions">
        <button className="text-button" type="button" onClick={onBack}>
          Back
        </button>
        <button className="button button-secondary" disabled={loading !== null} type="button" onClick={handleTest}>
          {loading === "test" ? "Testing" : "Test connection"}
        </button>
        <Button disabled={loading !== null} type="submit">
          <span>{loading === "save" ? "Saving" : "Save database"}</span>
        </Button>
      </div>
    </form>
  );
}

function DatabaseDetail({ path }: { path: string }) {
  const databaseId = path.split("/").filter(Boolean)[1] ?? "unknown";

  return (
    <main className="dashboard">
      <section className="dashboard-hero compact">
        <div>
          <p className="eyebrow">Database</p>
          <h1>{databaseId}</h1>
          <p>This route is wired for phase two connection details and phase three table browsing.</p>
        </div>
        <div className="status-chip">
          <CircleCheck size={14} />
          <span>Placeholder</span>
        </div>
      </section>
      <section className="detail-grid">
        <div className="detail-panel">
          <Server size={18} />
          <span>Connection profile will appear here.</span>
        </div>
        <div className="detail-panel">
          <Database size={18} />
          <span>Tables and schemas arrive in phase three.</span>
        </div>
      </section>
    </main>
  );
}
