const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, params, headers, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    credentials: 'include', // Include HttpOnly cookies (e.g. refresh token)
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! Status: ${response.status}`;
    let errorData: any = null;
    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Non-JSON response
    }
    throw new ApiError(response.status, errorMessage, errorData);
  }

  // If 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
