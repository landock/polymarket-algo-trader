/**
 * Custom Axios Adapter for Service Workers
 *
 * Service workers don't have XMLHttpRequest, so we need to use the Fetch API instead.
 * This adapter allows axios (used by CLOB client) to work in service worker context.
 */

import type { AxiosRequestConfig, AxiosResponse } from 'axios';

export default function fetchAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  return new Promise((resolve, reject) => {
    // Build the URL
    let url = config.url || '';
    if (config.baseURL && !url.startsWith('http')) {
      url = config.baseURL + url;
    }

    // Add query parameters
    if (config.params) {
      const queryString = new URLSearchParams(config.params).toString();
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    // Build headers
    const headers = new Headers();
    if (config.headers) {
      Object.keys(config.headers).forEach((key) => {
        const value = config.headers![key];
        if (value !== undefined && value !== null) {
          // Handle both string and object header values
          const headerValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          headers.set(key, headerValue);
        }
      });
    }

    // Add content-type header if not present and there's data
    if (config.data && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: config.method?.toUpperCase() || 'GET',
      headers: headers,
      body: config.data ? JSON.stringify(config.data) : undefined,
    };

    // Make the fetch request
    fetch(url, fetchOptions)
      .then(async (response) => {
        // Get response data
        let data: any;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          try {
            data = await response.json();
          } catch {
            data = await response.text();
          }
        } else {
          data = await response.text();
        }

        // Build response headers
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        // Build axios response
        const axiosResponse: AxiosResponse = {
          data: data,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders as any,
          config: config,
          request: undefined,
        };

        // Resolve or reject based on status
        if (response.ok) {
          resolve(axiosResponse);
        } else {
          reject({
            response: axiosResponse,
            message: `Request failed with status ${response.status}`,
            config: config,
            isAxiosError: true,
          });
        }
      })
      .catch((error) => {
        reject({
          message: error.message || 'Network error',
          config: config,
          isAxiosError: true,
        });
      });
  });
}
