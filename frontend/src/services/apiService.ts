// services/apiService.ts - API Service with Length Limit Handling

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// API Service Functions with Length Limit Handling
export const apiService = {
  // Data compression utility to handle large payloads
  compressData: (data: any) => {
    try {
      const compressed = {
        ...data,
        // Limit chat history to prevent large payloads
        chatHistory: data.chatHistory?.slice(-10),
        // Remove large fields from documents
        documents: data.documents?.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          status: doc.status
        }))
      };
      
      const jsonString = JSON.stringify(compressed);
      const sizeInMB = new Blob([jsonString]).size / 1024 / 1024;
      
      if (sizeInMB > 5) { // 5MB limit
        throw new Error(`Request data too large: ${sizeInMB.toFixed(2)}MB`);
      }
      
      return compressed;
    } catch (error) {
      throw new Error('Data compression failed: ' + error);
    }
  },

  // Make API request with timeout and retry logic
  makeRequest: async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 413) {
        throw new Error('Request payload too large. Please reduce input size.');
      }
      if (response.status === 414) {
        throw new Error('URL too long. Please simplify your request.');
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Retry logic for network errors
      if (retries > 0 && (error.name === 'AbortError' || error.message.includes('network'))) {
        console.log(`Retrying request, ${retries} attempts left...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return apiService.makeRequest(url, options, retries - 1);
      }
      
      throw error;
    }
  },

  // Authentication
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiService.makeRequest(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  },

  register: async (userData: { name: string; email: string; password: string }) => {
    const response = await apiService.makeRequest(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  },

  // User Profile
  getUserProfile: async (token: string) => {
    const response = await apiService.makeRequest(`${API_BASE_URL}/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.data || data;
  },

  updateUserProfile: async (token: string, userData: any) => {
    const compressedData = apiService.compressData(userData);
    const response = await apiService.makeRequest(`${API_BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(compressedData)
    });
    return response.json();
  },

  // Tax Calculator
  calculateTax: async (token: string, taxData: any) => {
    const compressedData = apiService.compressData({
      ...taxData,
      enableAIOptimizations: true
    });
    
    const response = await apiService.makeRequest(`${API_BASE_URL}/tax/calculate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(compressedData)
    });
    const data = await response.json();
    return data.data || data;
  },

  // Tax Forms
  saveTaxForm: async (token: string, formData: any) => {
    const compressedData = apiService.compressData(formData);
    const response = await apiService.makeRequest(`${API_BASE_URL}/tax-forms`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(compressedData)
    });
    return response.json();
  },

  // Enhanced Chat with length limits
  sendChatMessage: async (token: string, message: string, context?: any) => {
    const limitedContext = {
      currentTab: context?.currentTab,
      taxFormData: context?.taxFormData,
      documentsCount: context?.documentsCount,
      recentMessages: context?.chatHistory?.slice(-5) // Only last 5 messages
    };

    const requestData = apiService.compressData({
      message: message.slice(0, 2000), // Limit message length
      context: limitedContext
    });

    const response = await apiService.makeRequest(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(requestData)
    });
    const data = await response.json();
    return data.data || data;
  },

  // AI Insights
  getAIInsights: async (token: string) => {
    const response = await apiService.makeRequest(`${API_BASE_URL}/ai/insights`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.data || [];
  },

  // File Upload with chunking for large files
  uploadFile: async (token: string, file: File) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB allowed.`);
    }

    // For files larger than 5MB, use chunked upload
    if (file.size > 5 * 1024 * 1024) {
      return apiService.uploadFileInChunks(token, file);
    }

    // Direct upload for smaller files
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', 'auto-detect');
    
    const response = await apiService.makeRequest(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    
    const data = await response.json();
    return data.data;
  },

  // Chunked upload for large files
  uploadFileInChunks: async (token: string, file: File) => {
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = Date.now().toString();

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('uploadId', uploadId);
      formData.append('fileName', file.name);

      await apiService.makeRequest(`${API_BASE_URL}/documents/upload-chunk`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
    }

    // Merge chunks
    const response = await apiService.makeRequest(`${API_BASE_URL}/documents/merge-chunks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ uploadId, fileName: file.name })
    });

    return response.json();
  },

  // Get Documents
  getDocuments: async (token: string) => {
    const response = await apiService.makeRequest(`${API_BASE_URL}/documents`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.data || [];
  }
};