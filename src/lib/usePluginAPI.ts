import { useMemo } from 'react';
import { API_BASE, apiFetch, parseApiResponse } from '@emdash-cms/admin';

const PLUGIN_ID = 'roi-insights';

/**
 * Shim for usePluginAPI — @emdash-cms/admin 0.1.0 does not export this hook.
 * Builds a stable { get, post } helper that routes through the plugin API
 * at /_emdash/api/plugins/roi-insights/<path> using the admin apiFetch
 * wrapper (adds CSRF header) and parseApiResponse (handles error shapes).
 *
 * Remove this file once @emdash-cms/admin exports usePluginAPI natively.
 */
export function usePluginAPI() {
  return useMemo(() => ({
    get<T>(path: string): Promise<T> {
      return apiFetch(`${API_BASE}/plugins/${PLUGIN_ID}/${path}`)
        .then(r => parseApiResponse<T>(r));
    },
    post<T>(path: string, body: unknown): Promise<T> {
      return apiFetch(`${API_BASE}/plugins/${PLUGIN_ID}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => parseApiResponse<T>(r));
    },
  }), []);
}
