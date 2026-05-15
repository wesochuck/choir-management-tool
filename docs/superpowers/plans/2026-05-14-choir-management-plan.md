# Choir Management Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first Choir Management tool allowing admins to manage rosters, events, attendance, and seating charts, while allowing singers to RSVP and view schedules.

**Architecture:** PocketBase provides the SQLite database, Auth, and REST API. The frontend is a React (TypeScript) SPA built with Vite, emphasizing responsive design with Vanilla CSS.

**Tech Stack:** PocketBase, React, TypeScript, Vite, React Router, PocketBase JS SDK.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `pocketbase/` (directory for the backend binary)

- [ ] **Step 1: Initialize Vite React-TS project**

```bash
npm create vite@latest frontend -- --template react-ts
mv frontend/* .
mv frontend/.* .
rm -rf frontend
npm install
npm install pocketbase react-router-dom
```

- [ ] **Step 2: Setup basic App shell**

Modify `src/App.tsx`:
```tsx
import React from 'react';

export default function App() {
  return (
    <div>
      <h1>Choir Management</h1>
    </div>
  );
}
```

- [ ] **Step 3: Verify Frontend runs**

Run: `npm run build`
Expected: Successful build without TypeScript errors.

- [ ] **Step 4: Download and init PocketBase (macOS)**

```bash
mkdir pocketbase
cd pocketbase
curl -L -o pb.zip https://github.com/pocketbase/pocketbase/releases/download/v0.22.12/pocketbase_0.22.12_darwin_arm64.zip
unzip pb.zip
rm pb.zip
./pocketbase serve --dir="./pb_data" --publicDir="../dist" &
sleep 2
curl http://127.0.0.1:8090/api/health
kill %1
```
Expected: `curl` returns a 200 health check response.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: scaffold vite react app and pocketbase"
```

### Task 2: PocketBase Schema Initialization (Migrations)

PocketBase uses JS/Go migrations to define schemas programmatically. We will create a migration file to set up our collections.

**Files:**
- Create: `pocketbase/pb_migrations/1715690000_collections.js`

- [ ] **Step 1: Write the migration file**

Create `pocketbase/pb_migrations/1715690000_collections.js`:
```javascript
migrate((db) => {
  // 1. Update Users collection
  const users = db.findCollectionByNameOrId("users");
  users.schema.addField(new SchemaField({
    name: "role",
    type: "select",
    required: true,
    options: { maxSelect: 1, values: ["admin", "singer"] }
  }));
  db.saveCollection(users);

  // 2. Profiles Collection
  const profiles = new Collection({
    name: "profiles",
    type: "base",
    schema: [
      { name: "user", type: "relation", required: true, options: { collectionId: users.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "name", type: "text", required: true },
      { name: "phone", type: "text" },
      { name: "voicePart", type: "select", options: { maxSelect: 1, values: ["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"] } },
      { name: "globalStatus", type: "select", required: true, options: { maxSelect: 1, values: ["Active", "Inactive"] } },
      { name: "notes", type: "text" }
    ],
    listRule: "@request.auth.role = 'admin' || @request.auth.id = user",
    viewRule: "@request.auth.role = 'admin' || @request.auth.id = user",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin' || @request.auth.id = user",
    deleteRule: "@request.auth.role = 'admin'"
  });
  db.saveCollection(profiles);

  // 3. Events Collection
  const events = new Collection({
    name: "events",
    type: "base",
    schema: [
      { name: "date", type: "date", required: true },
      { name: "location", type: "text", required: true },
      { name: "type", type: "select", required: true, options: { maxSelect: 1, values: ["Performance", "Rehearsal"] } },
      { name: "details", type: "text" },
      { name: "parentPerformanceId", type: "relation", options: { collectionId: null, cascadeDelete: false, maxSelect: 1 } } // Will link to self after creation
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'"
  });
  db.saveCollection(events);
  
  // Fix parentPerformanceId relation
  events.schema.getFieldByName("parentPerformanceId").options.collectionId = events.id;
  db.saveCollection(events);

  // 4. EventRosters Collection
  const eventRosters = new Collection({
    name: "eventRosters",
    type: "base",
    schema: [
      { name: "profile", type: "relation", required: true, options: { collectionId: profiles.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "event", type: "relation", required: true, options: { collectionId: events.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "rsvp", type: "select", required: true, options: { maxSelect: 1, values: ["Yes", "No", "Pending"] } },
      { name: "attendance", type: "select", required: true, options: { maxSelect: 1, values: ["Present", "Absent", "Pending"] } },
      { name: "seatId", type: "text" }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin' || @request.auth.id = profile.user",
    deleteRule: "@request.auth.role = 'admin'"
  });
  db.saveCollection(eventRosters);
}, (db) => {
  db.findCollectionByNameOrId("eventRosters") && db.deleteCollection("eventRosters");
  db.findCollectionByNameOrId("events") && db.deleteCollection("events");
  db.findCollectionByNameOrId("profiles") && db.deleteCollection("profiles");
  const users = db.findCollectionByNameOrId("users");
  if(users) {
      users.schema.removeField("role");
      db.saveCollection(users);
  }
});
```

- [ ] **Step 2: Apply Migrations**

```bash
cd pocketbase
./pocketbase migrate
```
Expected: `Successfully applied 1 migration.`

- [ ] **Step 3: Commit**

```bash
git add pocketbase/pb_migrations/1715690000_collections.js
git commit -m "feat: initialize pocketbase schema migrations"
```

### Task 3: Frontend PocketBase Client & Auth Provider

**Files:**
- Create: `src/lib/pocketbase.ts`
- Create: `src/contexts/AuthContext.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Write PocketBase client instance**

Create `src/lib/pocketbase.ts`:
```typescript
import PocketBase from 'pocketbase';

// Export singleton instance
export const pb = new PocketBase(import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090');
```

- [ ] **Step 2: Create AuthContext**

Create `src/contexts/AuthContext.tsx`:
```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

interface AuthContextType {
  user: RecordModel | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.model);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(pb.authStore.model);
    setIsLoading(false);

    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 3: Wrap app in AuthProvider**

Modify `src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 4: Verify Compilation**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ src/contexts/ src/main.tsx
git commit -m "feat: setup pocketbase client and auth context"
```

### Task 4: Base Routing and Login View

**Files:**
- Create: `src/views/LoginView.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create Login Component**

Create `src/views/LoginView.tsx`:
```tsx
import React, { useState } from 'react';
import { pb } from '../lib/pocketbase';

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await pb.collection('users').authWithPassword(email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Login</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <button type="submit" style={{ padding: '15px', fontSize: '16px', cursor: 'pointer' }}>Sign In</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Setup React Router in App.tsx**

Modify `src/App.tsx`:
```tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginView from './views/LoginView';

const Dashboard = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: '20px' }}>
      <h2>Dashboard</h2>
      <p>Welcome, {user?.email} (Role: {user?.role})</p>
      <button onClick={() => pb.authStore.clear()}>Logout</button>
    </div>
  );
};

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginView />} />
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
```
*(Also add `import { pb } from './lib/pocketbase';` to App.tsx)*

- [ ] **Step 3: Verify Types**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 4: Commit**

```bash
git add src/views/ src/App.tsx
git commit -m "feat: add login view and basic routing"
```

*(Note: Further phases for Roster Management, Event Creation, Attendance Checking, and Seating Charts will be built using a similar component-driven approach communicating directly with the `pb.collection()` APIs).*
