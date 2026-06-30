import type {
  Client,
  ClientsQuery,
  CreateTrip,
  DashboardStats,
  LoginRequest,
  NearbyClient,
  NearbyQuery,
  Paginated,
  PatchClient,
  PlanTrip,
  SessionUser,
  TripView,
  WhatsappMessage,
  WhatsappRequest,
} from '@mapeando/shared';

const BASE = '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    throw new ApiError(res.status, detail);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
  ) {
    super(`API ${status}`);
  }
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  // auth
  login: (body: LoginRequest) =>
    req<SessionUser>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => req<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => req<SessionUser>('/auth/me'),

  // dashboard
  dashboard: () => req<DashboardStats>('/dashboard/stats'),

  // clients
  clients: (q: Partial<ClientsQuery>) =>
    req<Paginated<Client>>(`/clients${qs(q as Record<string, unknown>)}`),
  client: (id: string) => req<Client>(`/clients/${id}`),
  patchClient: (id: string, body: PatchClient) =>
    req<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  nearby: (q: NearbyQuery) => req<NearbyClient[]>(`/clients/nearby${qs(q as Record<string, unknown>)}`),
  mapPoints: () =>
    req<{ lat: number; lng: number; origem: string; situacao: string; quality: string }[]>(
      '/clients/map-points',
    ),

  // geo
  resolveCidade: (cidade: string, uf?: string) =>
    req<{ lat: number; lng: number; label: string; municipio: string | null; uf: string | null }>(
      `/geo/resolve${qs({ cidade, uf })}`,
    ),

  // trips
  createTrip: (body: CreateTrip) =>
    req<{ id: string }>('/trips', { method: 'POST', body: JSON.stringify(body) }),
  planTrip: (id: string, body: PlanTrip) =>
    req<TripView>(`/trips/${id}/plan`, { method: 'POST', body: JSON.stringify(body) }),
  trip: (id: string) => req<TripView>(`/trips/${id}`),

  // ia
  missao: (pedido: string) =>
    req<{ texto: string }>('/ai/missao', { method: 'POST', body: JSON.stringify({ pedido }) }),
  whatsapp: (body: WhatsappRequest) =>
    req<WhatsappMessage>('/ai/whatsapp', { method: 'POST', body: JSON.stringify(body) }),
};
