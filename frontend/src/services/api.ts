import axios, { AxiosInstance, AxiosResponse } from 'axios';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string): void {
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken(): void {
    delete this.api.defaults.headers.common['Authorization'];
  }

  private async handleResponse<T>(response: AxiosResponse): Promise<ApiResponse<T>> {
    return response.data;
  }

  private async handleError(error: any): Promise<ApiResponse> {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    return {
      success: false,
      message,
      errors: error.response?.data?.errors,
    };
  }

  async get<T = any>(endpoint: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get(endpoint, { params });
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post(endpoint, data);
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put(endpoint, data);
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete(endpoint);
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async upload<T = any>(endpoint: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await this.api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress(progress);
          }
        },
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async uploadMultiple<T = any>(endpoint: string, files: File[], onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await this.api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress(progress);
          }
        },
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Specialized methods for common endpoints

  // Auth
  async login(email: string, password: string) {
    return this.post('/auth/login', { email, password });
  }

  async register(userData: any) {
    return this.post('/auth/register', userData);
  }

  async getProfile() {
    return this.get('/auth/profile');
  }

  // Institutions
  async getInstitutions(params?: any) {
    return this.get('/institutions', params);
  }

  async getInstitution(id: string) {
    return this.get(`/institutions/${id}`);
  }

  async createInstitution(data: any) {
    return this.post('/institutions', data);
  }

  async updateInstitution(id: string, data: any) {
    return this.put(`/institutions/${id}`, data);
  }

  // Rankings
  async getCombinedRankings(params?: any) {
    return this.get('/rankings/combined', params);
  }

  async getPlatformRankings(platform: string, params?: any) {
    return this.get(`/rankings/platform/${platform}`, params);
  }

  async getTopInstitutions() {
    return this.get('/rankings/top/homepage');
  }

  async getTrendingInstitutions(params?: any) {
    return this.get('/rankings/trending', params);
  }

  // Metrics
  async getInstitutionMetrics(id: string, params?: any) {
    return this.get(`/metrics/institution/${id}`, params);
  }

  async addMetric(data: any) {
    return this.post('/metrics/add', data);
  }

  async bulkUploadMetrics(file: File, onProgress?: (progress: number) => void) {
    return this.upload('/metrics/bulk-upload', file, onProgress);
  }

  // Admin
  async getDashboardStats() {
    return this.get('/admin/dashboard/stats');
  }

  async getUsers() {
    return this.get('/admin/users');
  }

  async createUser(userData: any) {
    return this.post('/admin/users', userData);
  }

  async updateUser(id: string, userData: any) {
    return this.put(`/admin/users/${id}`, userData);
  }

  // Blog
  async getBlogPosts(params?: any) {
    return this.get('/blog', params);
  }

  async getBlogPost(slug: string) {
    return this.get(`/blog/${slug}`);
  }

  async createBlogPost(data: any) {
    return this.post('/blog', data);
  }

  async updateBlogPost(id: string, data: any) {
    return this.put(`/blog/${id}`, data);
  }

  async deleteBlogPost(id: string) {
    return this.delete(`/blog/${id}`);
  }

  // Settings
  async getPublicSettings() {
    return this.get('/settings/public');
  }

  async getAllSettings() {
    return this.get('/settings/all');
  }

  async updateSetting(key: string, data: any) {
    return this.put(`/settings/${key}`, data);
  }
}

export const apiService = new ApiService();
