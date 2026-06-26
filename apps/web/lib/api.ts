// Componentele de client folosesc NEXT_PUBLIC_API_URL (/api relativ în producție, proxat de Nginx).
// Componentele de server folosesc INTERNAL_API_URL (http://api:3001 absolut în Docker).
const API_URL =
  typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api')
    : (process.env.NEXT_PUBLIC_API_URL || '/api');

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const SESSION_JWT_KEY = 'session_jwt';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function setAccessToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', token);
  }
}

function clearAccessToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
  }
}

function getSessionJwt(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_JWT_KEY);
}

function setSessionJwt(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_JWT_KEY, token);
  }
}

function clearSessionJwt() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_JWT_KEY);
  }
}

async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const userToken = getAccessToken();
  const sessionToken = userToken ? null : getSessionJwt();
  const token = userToken ?? sessionToken;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Tratarea erorii 401: reîmprospătăm și redirecționăm doar când am folosit un JWT real de utilizator.
  // Pentru JWT-urile de sesiune (fluxul anonim) nu există mecanism de reîmprospătare — doar
  // propagăm eroarea, astfel încât apelantul să decidă ce face (NU redirecționăm).
  if (res.status === 401) {
    if (userToken) {
      const newToken = await refreshToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(`${API_URL}${path}`, {
          ...options,
          headers,
          credentials: 'include',
        });
      } else {
        clearAccessToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth';
        }
        throw new ApiError(401, 'Session expired.');
      }
    } else if (sessionToken) {
      clearSessionJwt();
      throw new ApiError(401, 'Session expired.');
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ============================================================================
// AUTENTIFICARE
// ============================================================================

export const api = {
  auth: {
    async register(data: { email: string; password: string; companyName: string }) {
      const result = await request<{ accessToken: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setAccessToken(result.accessToken);
      return result;
    },

    async login(data: { email: string; password: string }) {
      const result = await request<{ accessToken: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setAccessToken(result.accessToken);
      return result;
    },

    async logout() {
      await request('/auth/logout', { method: 'POST' }).catch(() => {});
      clearAccessToken();
    },

    async refresh() {
      return refreshToken();
    },

    async forgotPassword(email: string) {
      return request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    async resetPassword(token: string, newPassword: string) {
      return request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
    },

    async getMe() {
      return request<{
        id: string;
        email: string;
        profile: any;
        isAdmin: boolean;
      }>('/auth/me');
    },
  },

  // ============================================================================
  // EVALUĂRI
  // ============================================================================

  assessments: {
    async create(language: 'en' | 'ro') {
      return request('/assessments', { method: 'POST', body: JSON.stringify({ language }) });
    },
    async getById(id: string) {
      return request(`/assessments/${id}`);
    },
    async saveAnswer(id: string, data: { refType: string; refCode: string; valueJson: any }) {
      return request(`/assessments/${id}/answers`, { method: 'POST', body: JSON.stringify(data) });
    },
    async complete(id: string) {
      return request(`/assessments/${id}/complete`, { method: 'POST' });
    },
    async claim(id: string, sessionToken: string) {
      return request(`/assessments/${id}/claim`, {
        method: 'POST',
        body: JSON.stringify({ sessionToken }),
      });
    },
    async getResults(id: string) {
      return request(`/assessments/${id}/results`);
    },
    async getAnswers(id: string) {
      return request(`/assessments/${id}/answers`);
    },
    async getHistory() {
      return request('/assessments');
    },
    async remove(id: string) {
      return request(`/assessments/${id}`, { method: 'DELETE' });
    },
  },

  // ============================================================================
  // ÎNTREBĂRI
  // ============================================================================

  questions: {
    async getAll() {
      return request('/questions');
    },
    async getAnswerTypeOptions() {
      return request('/questions/answer-type-options');
    },
  },

  // ============================================================================
  // LINK-URI DE PARTAJARE
  // ============================================================================

  shareLinks: {
    async create(assessmentId: string) {
      return request('/share-links', {
        method: 'POST',
        body: JSON.stringify({ assessmentId }),
      });
    },
    async getByToken(token: string) {
      return request(`/share-links/${token}`);
    },
  },

  // ============================================================================
  // ADMINISTRARE
  // ============================================================================

  admin: {
    async getCompanies(params?: {
      search?: string;
      page?: number;
      limit?: number;
      riskLevel?: string;
      questionCode?: string;
      answerValue?: string;
    }) {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.riskLevel) qs.set('riskLevel', params.riskLevel);
      if (params?.questionCode) qs.set('questionCode', params.questionCode);
      if (params?.answerValue) qs.set('answerValue', params.answerValue);
      return request(`/admin/companies?${qs.toString()}`);
    },
    async getCompanyById(id: string) {
      return request(`/admin/companies/${id}`);
    },
    async getQuestions() {
      return request('/admin/questions');
    },
    async createQuestion(data: any) {
      return request('/admin/questions', { method: 'POST', body: JSON.stringify(data) });
    },
    async updateQuestion(id: string, data: any) {
      return request(`/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    async deleteQuestion(id: string) {
      return request(`/admin/questions/${id}`, { method: 'DELETE' });
    },
    async downloadQuestionsTemplate(format: 'csv' | 'xlsx') {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/admin/questions/import/template?format=${format}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.message || `Download failed: ${res.status}`);
      }
      return res.blob();
    },
    async previewQuestionsImport(file: File) {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/admin/questions/import/preview`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.message || `Preview failed: ${res.status}`);
      }
      return res.json();
    },
    async commitQuestionsImport(file: File) {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/admin/questions/import/commit`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.message || `Import failed: ${res.status}`);
      }
      return res.json();
    },
    async getDedupePairs(status?: string) {
      const qs = status ? `?status=${status}` : '';
      return request(`/admin/dedupe-pairs${qs}`);
    },
    async createDedupePair(data: { gateCode: string; questionCode: string; notes?: string }) {
      return request('/admin/dedupe-pairs', { method: 'POST', body: JSON.stringify(data) });
    },
    async updateDedupePair(id: string, data: { status?: string; notes?: string }) {
      return request(`/admin/dedupe-pairs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    async getAuditLogs(params?: any) {
      const qs = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
      return request(`/admin/audit-logs?${qs.toString()}`);
    },
    async exportCompanies() {
      return request('/admin/exports/companies');
    },
    async runMigration(name: string) {
      return request(`/admin/migrations/${name}`, { method: 'POST' });
    },
    async getGateRules(gateCode?: string) {
      const qs = gateCode ? `?gateCode=${encodeURIComponent(gateCode)}` : '';
      return request(`/admin/gate-rules${qs}`);
    },
    async createGateRule(data: any) {
      return request('/admin/gate-rules', { method: 'POST', body: JSON.stringify(data) });
    },
    async updateGateRule(id: string, data: any) {
      return request(`/admin/gate-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    async deactivateGateRule(id: string) {
      return request(`/admin/gate-rules/${id}/deactivate`, { method: 'PUT' });
    },
    async getAnswerTypeOptions() {
      return request('/admin/answer-type-options');
    },
    async createAnswerTypeOption(data: {
      answerType: string; value: string; labelEn: string; labelRo: string;
      score: number; sortOrder?: number; isActive?: boolean;
    }) {
      return request('/admin/answer-type-options', { method: 'POST', body: JSON.stringify(data) });
    },
    async updateAnswerTypeOption(id: string, data: {
      labelEn?: string; labelRo?: string; score?: number; sortOrder?: number; isActive?: boolean;
    }) {
      return request(`/admin/answer-type-options/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    async getCategories() {
      return request('/admin/categories');
    },
    async createCategory(data: {
      key: string;
      domain: string;
      maxPoints: number;
      nameEn: string;
      nameRo: string;
      sortOrder?: number;
      isActive?: boolean;
    }) {
      return request('/admin/categories', { method: 'POST', body: JSON.stringify(data) });
    },
    async updateCategory(id: string, data: {
      maxPoints?: number;
      nameEn?: string;
      nameRo?: string;
      sortOrder?: number;
      isActive?: boolean;
    }) {
      return request(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
  },
};

export { ApiError, getAccessToken, clearAccessToken, getSessionJwt, setSessionJwt, clearSessionJwt };
