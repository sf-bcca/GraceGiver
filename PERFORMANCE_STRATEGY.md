# Technical Strategy: High-Performance Mobile Web Application for Emerging Markets

## 1. Core Principles

For users on slow or unstable connections (2G/3G), the application must prioritize **perceived performance** and **reliability**.

*   **Load Less, Load Faster:** Minimize the initial payload. Only send what is immediately needed.
*   **Resilience:** The application should not break when the network fails. It should queue actions or display cached data.
*   **Feedback:** Provide immediate visual feedback for all interactions, even if the backend response is delayed.
*   **Progressive Enhancement:** The core functionality must work on low-end devices; advanced features can "layer on" for better environments.

## 2. Front-End Optimization Strategies (React/Vite)

### Asset Loading & Bundle Optimization
*   **Code Splitting:** Use `React.lazy` and `Suspense` to split the application by route/view (e.g., Dashboard, Reports, Directory). This prevents users from downloading the code for "Reports" when they just want to log in.
*   **Tree Shaking:** Ensure all imports are specific (e.g., `import { Button } from 'lib'` instead of `import * as lib`).
*   **Compression:** Ensure all static assets (JS, CSS, HTML) are served with Gzip or Brotli compression.

### Caching & Offline Capabilities
*   **Service Worker (PWA):** Implement a Service Worker using `vite-plugin-pwa`.
    *   **Cache-First Strategy:** For static assets (fonts, icons, JS bundles), use a "Cache First" strategy.
    *   **Network-First Strategy:** For API data that changes frequently (e.g., Member Lists), use "Network First, fall back to Cache".
*   **Persistent State:** Store critical data (user session, recent transactions) in `localStorage` or `IndexedDB` so the app restores context immediately upon reload, even offline.

### Rendering Performance
*   **Virtualization:** For long lists (like the Member Directory), use "virtual scrolling" (e.g., `react-window`) to render only the visible items.
*   **Optimistic UI:** When a user creates a Donation, update the UI immediately (add to list, update total) while the API request processes in the background.

## 3. Back-End/API Communication Strategies (Node/Express)

### Efficient Data Transfer
*   **Response Compression:** Enable Gzip compression on the Express server (`compression` middleware) for all JSON responses.
*   **Pagination:** Strictly enforce pagination for list endpoints (`/api/members`, `/api/donations`). Default to small page sizes (e.g., 20 or 50) to prevent massive payloads.
*   **Field Selection:** (Future) Allow the client to request specific fields (e.g., `?fields=id,name`) to reduce payload size.

### Database Interaction (PostgreSQL)
*   **Indexing:** Ensure columns used in `WHERE`, `ORDER BY`, and `JOIN` clauses are indexed.
    *   *Critical Indexes:* `members(last_name)`, `members(email)`, `donations(donation_date)`, `donations(member_id)`.
*   **Query Optimization:** Avoid `SELECT *` where possible in internal logic. Use `COUNT(*)` optimized queries for pagination metadata.

## 4. Testing & Monitoring

*   **Network Throttling:** Developers must test using Chrome DevTools "Network" tab set to "Slow 3G".
*   **Lighthouse Audits:** Regularly run Lighthouse mobile audits. Target:
    *   LCP (Largest Contentful Paint) < 2.5s on 3G.
    *   CLS (Cumulative Layout Shift) < 0.1.
*   **Bundle Analysis:** Use `rollup-plugin-visualizer` to monitor bundle size growth.

## 5. Key Technologies

*   **Vite PWA Plugin:** For effortless Service Worker generation.
*   **React Suspense/Lazy:** For code splitting.
*   **Compression (Node middleware):** For API response compression.
*   **TanStack Query (Recommended Future):** For advanced caching, background refetching, and optimistic updates.
