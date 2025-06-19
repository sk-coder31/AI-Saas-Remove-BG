export interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  plan: 'free' | 'pro' | 'premium';
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  updateCredits: (credits: number) => void;
}

export interface ProcessedImage {
  id: string;
  originalUrl: string;
  processedUrl: string;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  credits: number;
  features: string[];
  popular?: boolean;
}