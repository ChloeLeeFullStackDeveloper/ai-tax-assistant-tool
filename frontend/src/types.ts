export interface TaxFormData {
  income: string;
  deductions: string;
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head_of_household';
  taxYear: string;
}

export interface ChatMessage {
  type: 'user' | 'bot';
  message: string;
  time: string;
  confidence?: number;
  aiInsight?: boolean;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadDate: string;
  status: 'processing' | 'completed' | 'error';
  analysis?: {
    documentType: string;
    confidence: string;
    extractedData: Record<string, any>;
    aiScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
}

export interface AIInsight {
  id: string;
  type: 'optimization' | 'warning' | 'opportunity';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  estimatedSavings?: number;
  completed: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface TaxResults {
  tax: number;
  taxableIncome: number;
  effectiveRate: number;
  estimatedRefund: number;
  federalTax: number;
  provincialTax: number;
  cppContribution: number;
  eiContribution: number;
}

export interface AuthModalProps {
  onLogin: (loginData: { email: string; password: string }) => void;
  onRegister: (registerData: { name: string; email: string; password: string; confirmPassword: string }) => void;
  isLoading: boolean;
  error: string;
  setError: (error: string) => void;
}

export interface ChatModalProps {
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setShowChat: (show: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  activeTab: string;
  taxFormData: TaxFormData;
  uploadedFiles: UploadedFile[];
}

export interface DashboardProps {
  aiInsights: AIInsight[];
  uploadedFiles: UploadedFile[];
  setActiveTab: (tab: string) => void;
  setShowChat: (show: boolean) => void;
}

export interface DocumentsProps {
  uploadedFiles: UploadedFile[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  selectedDocument: UploadedFile | null;
  setSelectedDocument: (doc: UploadedFile | null) => void;
  setError: (error: string) => void;
  setIsLoading: (loading: boolean) => void;
}

export interface TaxFormsProps {
  taxFormData: TaxFormData;
  setTaxFormData: React.Dispatch<React.SetStateAction<TaxFormData>>;
  setError: (error: string) => void;
  setIsLoading: (loading: boolean) => void;
}

export interface TaxCalculatorProps {
  taxFormData: TaxFormData;
  setTaxFormData: React.Dispatch<React.SetStateAction<TaxFormData>>;
  setError: (error: string) => void;
  setIsLoading: (loading: boolean) => void;
}

export interface ProfileProps {
  user: User | null;
  uploadedFiles: UploadedFile[];
  aiInsights: AIInsight[];
  setIsLoading: (loading: boolean) => void;
}

export type ActiveTab = 'Dashboard' | 'Documents' | 'Tax Forms' | 'Calculator' | 'Profile';