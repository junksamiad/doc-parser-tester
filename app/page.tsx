'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Send, CheckCircle, AlertCircle, FileText, FileImage, Loader2, X, Clock, Webhook, RefreshCw, Shuffle } from 'lucide-react';

type SendMethod = 'base64' | 'formdata' | 'url';

interface ResponseData {
  success: boolean;
  data?: Record<string, unknown>;
  error?: { message?: string; code?: string };
  metadata?: {
    processingTime?: string;
    cost?: { formattedCost?: string };
    requestId?: string;
  };
}

interface WebhookPayload {
  timestamp: string;
  headers: Record<string, string>;
  body: unknown;
  method: string;
  url: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [sendMethod, setSendMethod] = useState<SendMethod>('base64');
  const [endpointUrl] = useState<string>('https://document-parser.easyrecruit.ai/api/v2/passport');
  const [apiKey] = useState<string>('dp_test_TrM7vCA3DUEwJJjlg2GF63yBSer1_ZySzK54NkUy4kIJgoKZi_CzMh6vCL51SAq7');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [error, setError] = useState<string>('');
  const [storageUrl, setStorageUrl] = useState<string>('');
  const [manualUrl, setManualUrl] = useState<string>('');
  const [businessId, setBusinessId] = useState<string>('');
  const [requestId, setRequestId] = useState<string>('');
  const [useProxy, setUseProxy] = useState<boolean>(true);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const [webhookPayload, setWebhookPayload] = useState<WebhookPayload | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState<boolean>(false);
  const [processedDocumentUrl, setProcessedDocumentUrl] = useState<string>('');

  // Timer effect
  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isLoading]);

  // Webhook polling effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const fetchWebhookPayload = async () => {
      try {
        const res = await fetch('/api/webhook');
        const data = await res.json();
        if (data.success && data.payload) {
          setWebhookPayload(data.payload);
          setIsWaitingForWebhook(false);

          // Document URL is already set when request is sent, nothing to do here
        }
      } catch (err) {
        console.error('Failed to fetch webhook payload:', err);
      }
    };

    if (isPolling) {
      fetchWebhookPayload(); // Fetch immediately
      intervalId = setInterval(fetchWebhookPayload, 2000); // Poll every 2 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPolling]);

  const formatElapsedTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 100);

    if (totalSeconds < 60) {
      return `${totalSeconds}.${milliseconds}s`;
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}.${milliseconds}s`;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        setFile(file);
        setError('');
        setStorageUrl(''); // Clear storage URL when new file is selected
      } else {
        setError('Please upload a PDF or image file (JPG, PNG)');
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        setFile(file);
        setError('');
        setStorageUrl(''); // Clear storage URL when new file is selected
      } else {
        setError('Please upload a PDF or image file (JPG, PNG)');
      }
    }
  }, []);

  const uploadToStorage = async (file: File): Promise<string> => {
    // For now, we'll use Vercel Blob storage
    // This would be replaced with actual storage upload logic
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload file to storage');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Storage upload error:', error);
      throw new Error('Storage upload is not configured. Please use base64 or formdata method.');
    }
  };

  const sendRequest = async () => {
    // Validate based on send method
    if (sendMethod === 'url') {
      if (!manualUrl) {
        setError('Please enter a document URL');
        return;
      }
    } else {
      if (!file) {
        setError('Please select a file');
        return;
      }
    }

    if (!endpointUrl) {
      setError('Please enter an endpoint URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setResponse(null);
    setElapsedTime(0);
    setProcessedDocumentUrl(''); // Clear previous document URL

    try {
      let requestBody: FormData | string;
      const headers: HeadersInit = {};

      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      if (requestId) {
        headers['x-request-id'] = requestId;
      }

      if (sendMethod === 'base64') {
        // Convert file to base64
        if (!file) {
          setError('File is required for base64 method');
          setIsLoading(false);
          return;
        }
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data URL prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        headers['Content-Type'] = 'application/json';
        const payload: Record<string, string> = {
          document: base64
        };
        if (businessId) {
          payload.businessId = businessId;
        }
        requestBody = JSON.stringify(payload);
      } else if (sendMethod === 'formdata') {
        // Send as multipart form data
        if (!file) {
          setError('File is required for formdata method');
          setIsLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('document', file);
        if (businessId) {
          formData.append('businessId', businessId);
        }
        requestBody = formData;
        // Don't set Content-Type for FormData - browser will set it with boundary
      } else {
        // sendMethod === 'url'
        // Use manual URL if provided, otherwise upload to storage
        headers['Content-Type'] = 'application/json';

        if (manualUrl) {
          // Use the manually entered URL
          setProcessedDocumentUrl(manualUrl); // Store the URL we're processing
          const payload: Record<string, string> = {
            document_url: manualUrl
          };
          if (businessId) {
            payload.businessId = businessId;
          }
          requestBody = JSON.stringify(payload);
        } else {
          // Upload to storage and send URL
          if (!file) {
            setError('File is required for storage upload');
            setIsLoading(false);
            return;
          }
          try {
            const uploadedUrl = storageUrl || await uploadToStorage(file);
            setStorageUrl(uploadedUrl);
            setProcessedDocumentUrl(uploadedUrl); // Store the URL we're processing

            const payload: Record<string, string> = {
              document_url: uploadedUrl
            };
            if (businessId) {
              payload.businessId = businessId;
            }
            requestBody = JSON.stringify(payload);
          } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
            setIsLoading(false);
            return;
          }
        }
      }

      // Use proxy if enabled to avoid CORS issues
      const targetUrl = useProxy
        ? `/api/proxy?url=${encodeURIComponent(endpointUrl)}`
        : endpointUrl;

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: requestBody
      });

      const data = await response.json();
      setResponse(data);

      if (!response.ok) {
        setError(`HTTP ${response.status}: ${data.error?.message || 'Request failed'}`);
      } else {
        // Start waiting for webhook after successful response
        setIsWaitingForWebhook(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRandomUrl = async () => {
    try {
      const response = await fetch('/test-urls.txt');
      const text = await response.text();
      const urls = text.split('\n').filter(url => url.trim() !== '');

      if (urls.length > 0) {
        const randomUrl = urls[Math.floor(Math.random() * urls.length)];
        setManualUrl(randomUrl.trim());
        setError('');
      } else {
        setError('No URLs found in test file');
      }
    } catch (err) {
      setError('Failed to load test URLs');
      console.error('Error loading random URL:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    return <FileImage className="w-8 h-8 text-blue-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/doc-parser-icon.ico"
              alt="Document Parser Icon"
              className="w-12 h-12"
            />
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                Document Parser Tester
              </h1>
              <p className="text-slate-600">Test your passport parsing API with different upload methods</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            title="Refresh page"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Webhook Listener Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-slate-900">Webhook Listener</h2>
            </div>
            <button
              onClick={() => setIsPolling(!isPolling)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isPolling
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isPolling ? 'Stop Listening' : 'Start Listening'}
            </button>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-slate-700 mb-1">Webhook URL:</p>
            <code className="text-sm text-purple-600 bg-white px-3 py-2 rounded border border-slate-200 block">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/webhook` : '/api/webhook'}
            </code>
          </div>

          {isPolling && (
            <div className="flex items-center gap-2 text-sm text-green-600 mb-4">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              Listening for webhooks...
            </div>
          )}

          {/* Show processed document URL if available */}
          {processedDocumentUrl && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileImage className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-slate-900">Processed Document:</p>
              </div>
              <a
                href={processedDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 underline break-all"
              >
                {processedDocumentUrl}
              </a>
            </div>
          )}

          {/* Show waiting spinner */}
          {isWaitingForWebhook && !webhookPayload && (
            <div className="flex items-center justify-center gap-3 py-8 text-purple-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-medium">Waiting for webhook response...</span>
            </div>
          )}

          {webhookPayload ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Webhook Received</span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(webhookPayload.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-50 rounded px-3 py-2">
                  <span className="text-slate-600">Method:</span>
                  <span className="ml-2 font-medium">{webhookPayload.method}</span>
                </div>
                <div className="bg-slate-50 rounded px-3 py-2">
                  <span className="text-slate-600">Timestamp:</span>
                  <span className="ml-2 font-mono text-xs">{new Date(webhookPayload.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 max-h-[300px] overflow-auto">
                <p className="text-sm font-medium text-slate-700 mb-2">Payload:</p>
                <pre className="text-xs text-slate-800 whitespace-pre-wrap break-words">
                  {JSON.stringify(webhookPayload.body, null, 2)}
                </pre>
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer text-slate-600 hover:text-slate-900 font-medium">
                  View Headers
                </summary>
                <div className="mt-2 bg-slate-50 rounded-lg p-3 max-h-[200px] overflow-auto">
                  <pre className="text-xs text-slate-800 whitespace-pre-wrap break-words">
                    {JSON.stringify(webhookPayload.headers, null, 2)}
                  </pre>
                </div>
              </details>

              <button
                onClick={async () => {
                  setWebhookPayload(null);
                  setProcessedDocumentUrl('');
                  setIsWaitingForWebhook(false);
                  // Clear on server side too
                  try {
                    await fetch('/api/webhook', { method: 'DELETE' });
                  } catch (err) {
                    console.error('Failed to clear webhook data on server:', err);
                  }
                }}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear webhook data
              </button>
            </div>
          ) : !isWaitingForWebhook ? (
            <div className="text-center py-8 text-slate-500">
              <Webhook className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No webhook received yet</p>
              <p className="text-sm mt-1">Send a POST request to the webhook URL above</p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Upload and Settings */}
          <div className="space-y-6">
            {/* API Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">API Configuration</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={endpointUrl}
                    readOnly
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                    placeholder="https://api.example.com/api/v1/passport"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    readOnly
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                    placeholder="your-api-key"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Business ID (optional)
                  </label>
                  <input
                    type="text"
                    value={businessId}
                    onChange={(e) => setBusinessId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="customer-12345"
                  />
                  <p className="text-xs text-slate-500 mt-1">Optional identifier for your reference</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Request ID (optional)
                  </label>
                  <input
                    type="text"
                    value={requestId}
                    onChange={(e) => setRequestId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="req-abc-123"
                  />
                  <p className="text-xs text-slate-500 mt-1">Sent as x-request-id header for request tracking</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Use Proxy (Avoid CORS)</p>
                    <p className="text-xs text-slate-600 mt-0.5">Enable to bypass CORS restrictions when testing external APIs</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useProxy}
                      onChange={(e) => setUseProxy(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Upload Document</h2>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                  onChange={handleFileSelect}
                />

                {file ? (
                  <div className="space-y-3">
                    {getFileIcon(file)}
                    <div>
                      <p className="font-medium text-slate-900">{file.name}</p>
                      <p className="text-sm text-slate-600">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setStorageUrl('');
                      }}
                      className="text-sm text-red-600 hover:text-red-700 flex items-center mx-auto gap-1"
                    >
                      <X className="w-4 h-4" />
                      Remove file
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Click to upload
                    </label>
                    <p className="text-slate-600 mt-1">or drag and drop</p>
                    <p className="text-sm text-slate-500 mt-2">
                      PDF, JPG, PNG, WebP, HEIC (max 20MB)
                    </p>
                  </>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>

            {/* Send Method */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Send Method</h2>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value="base64"
                    checked={sendMethod === 'base64'}
                    onChange={(e) => setSendMethod(e.target.value as SendMethod)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-slate-900">JSON with Base64</span>
                    <p className="text-sm text-slate-600">Encode file as base64 string in JSON payload</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value="formdata"
                    checked={sendMethod === 'formdata'}
                    onChange={(e) => setSendMethod(e.target.value as SendMethod)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-slate-900">Multipart Form Data</span>
                    <p className="text-sm text-slate-600">Send raw file as multipart/form-data</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value="url"
                    checked={sendMethod === 'url'}
                    onChange={(e) => setSendMethod(e.target.value as SendMethod)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-slate-900">Document URL</span>
                    <p className="text-sm text-slate-600">Send a URL to an existing document</p>
                  </div>
                </label>

                {sendMethod === 'url' && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Document URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualUrl}
                          onChange={(e) => setManualUrl(e.target.value)}
                          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.com/passport.jpg"
                        />
                        <button
                          onClick={loadRandomUrl}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                          title="Load random test URL"
                        >
                          <Shuffle className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Enter the URL of the document you want to parse or click the shuffle icon for a random test URL</p>
                    </div>
                    {storageUrl && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>Uploaded URL:</strong> {storageUrl}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={sendRequest}
                disabled={
                  (sendMethod === 'url' ? !manualUrl : !file) ||
                  !endpointUrl ||
                  isLoading
                }
                className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                <div className="flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                      <div className="flex items-center gap-1 ml-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono text-sm">{formatElapsedTime(elapsedTime)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send Request</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Right Column - Response */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Response</h2>

            {response ? (
              <div className="space-y-4">
                {response.success ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Success</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Error</span>
                  </div>
                )}

                <div className="bg-slate-50 rounded-lg p-4 max-h-[600px] overflow-auto">
                  <pre className="text-sm text-slate-800 whitespace-pre-wrap break-words">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>

                {response.metadata && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {response.metadata.processingTime && (
                      <div className="bg-slate-50 rounded px-3 py-2">
                        <span className="text-slate-600">Processing Time:</span>
                        <span className="ml-2 font-medium">{response.metadata.processingTime}</span>
                      </div>
                    )}
                    {response.metadata.cost?.formattedCost && (
                      <div className="bg-slate-50 rounded px-3 py-2">
                        <span className="text-slate-600">Cost:</span>
                        <span className="ml-2 font-medium">{response.metadata.cost.formattedCost}</span>
                      </div>
                    )}
                    {response.metadata.requestId && (
                      <div className="bg-slate-50 rounded px-3 py-2 col-span-2">
                        <span className="text-slate-600">Request ID:</span>
                        <span className="ml-2 font-mono text-xs">{response.metadata.requestId}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No response yet</p>
                <p className="text-sm mt-1">Upload a document and send a request to see the response</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}