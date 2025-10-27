'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown, ChevronUp, Check, X, User, MapPin,
  Calendar, AlertTriangle, Eye, ArrowLeft, Code, Building2
} from 'lucide-react';

interface WebhookPayload {
  timestamp: string;
  headers: Record<string, string>;
  body: unknown;
  method: string;
  url: string;
}

export default function ProofOfAddressViewPage() {
  const router = useRouter();
  const [webhookData, setWebhookData] = useState<WebhookPayload | null>(null);
  const [processedDocUrl, setProcessedDocUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['pre_validation', 'address_information', 'personal_information'])
  );
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    const storedData = sessionStorage.getItem('webhookData');
    const storedUrl = sessionStorage.getItem('processedDocUrl');

    if (storedData) {
      setWebhookData(JSON.parse(storedData));
    }
    if (storedUrl) {
      setProcessedDocUrl(storedUrl);
    }
    setLoading(false);
  }, []);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const renderValue = (value: unknown): React.ReactElement | string => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">Not provided</span>;
    }
    if (typeof value === 'boolean') {
      return value ? (
        <span className="text-green-600 flex items-center gap-1 font-medium">
          <Check className="w-4 h-4" /> Yes
        </span>
      ) : (
        <span className="text-red-600 flex items-center gap-1 font-medium">
          <X className="w-4 h-4" /> No
        </span>
      );
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-400 italic">None</span>;
      return (
        <div className="space-y-1">
          {value.map((item, idx) => (
            <div key={idx} className="text-sm bg-gray-50 px-2 py-1 rounded">
              {String(item)}
            </div>
          ))}
        </div>
      );
    }
    return String(value);
  };

  const AccordionSection = ({
    title,
    icon,
    sectionKey,
    data,
    bgColor = 'bg-white',
    borderColor = 'border-gray-200',
  }: {
    title: string;
    icon: React.ReactNode;
    sectionKey: string;
    data: Record<string, unknown>;
    bgColor?: string;
    borderColor?: string;
  }) => {
    const isExpanded = expandedSections.has(sectionKey);
    const hasData = data && Object.keys(data).length > 0;

    return (
      <div className={`${bgColor} rounded-xl shadow-sm border ${borderColor} overflow-hidden`}>
        <button
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection(sectionKey)}
        >
          <div className="flex items-center gap-3">
            {icon}
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
              {hasData && (
                <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 px-2 py-1 rounded">
                  ✓ Extracted
                </span>
              )}
            </h3>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {isExpanded && (
          <div className="px-6 pb-6 pt-2">
            {hasData ? (
              <div className="space-y-4">
                {Object.entries(data).map(([key, valueObj]) => {
                  if (!valueObj || typeof valueObj !== 'object') return null;

                  const { value, data_check } = valueObj as { value: unknown; data_check?: unknown };

                  return (
                    <div key={key} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="font-medium text-gray-700 mb-2">
                        {key
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </div>
                      <div className="text-gray-900 mb-1">{renderValue(value)}</div>
                      {data_check !== null && data_check !== undefined && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                          <span className="font-medium">Evidence: </span>
                          {typeof data_check === 'string'
                            ? data_check
                            : renderValue(data_check)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 italic">No data extracted for this section</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Special renderer for document_provider with nested utility_provider structure
  const DocumentProviderSection = ({
    data,
  }: {
    data: Record<string, unknown>;
  }) => {
    const isExpanded = expandedSections.has('document_provider');
    const utilityProvider = data.utility_provider as Record<string, unknown> | undefined;
    const hasData = utilityProvider && Object.keys(utilityProvider).length > 0;

    return (
      <div className="bg-indigo-50 rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
        <button
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection('document_provider')}
        >
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Document Provider
              {hasData && (
                <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 px-2 py-1 rounded">
                  ✓ Extracted
                </span>
              )}
            </h3>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {isExpanded && (
          <div className="px-6 pb-6 pt-2">
            {hasData && utilityProvider ? (
              <div className="space-y-4">
                {Object.entries(utilityProvider).map(([key, valueObj]) => {
                  if (!valueObj || typeof valueObj !== 'object') return null;

                  const { value, data_check } = valueObj as { value: unknown; data_check?: unknown };

                  return (
                    <div key={key} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="font-medium text-gray-700 mb-2">
                        {key
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </div>
                      <div className="text-gray-900 mb-1">{renderValue(value)}</div>
                      {data_check !== null && data_check !== undefined && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                          <span className="font-medium">Evidence: </span>
                          {typeof data_check === 'string'
                            ? data_check
                            : renderValue(data_check)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 italic">No provider data extracted</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Special renderer for personal_information with dual account holder support
  const PersonalInformationSection = ({
    data,
  }: {
    data: Record<string, unknown>;
  }) => {
    const isExpanded = expandedSections.has('personal_information');
    const hasData = data && Object.keys(data).length > 0;

    // Separate fields by account holder
    const holderOneFields = Object.entries(data).filter(([key]) => key.includes('_one'));
    const holderTwoFields = Object.entries(data).filter(([key]) => key.includes('_two'));
    const hasHolderTwo = holderTwoFields.some(([, valueObj]) => {
      const { value } = valueObj as { value: unknown };
      return value !== null && value !== undefined && value !== '';
    });

    return (
      <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 overflow-hidden">
        <button
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection('personal_information')}
        >
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Personal Information
              {hasData && (
                <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 px-2 py-1 rounded">
                  ✓ Extracted
                </span>
              )}
            </h3>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {isExpanded && (
          <div className="px-6 pb-6 pt-2">
            {hasData ? (
              <div className="space-y-6">
                {/* Primary Account Holder */}
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">Primary Account Holder</h4>
                  <div className="space-y-3">
                    {holderOneFields.map(([key, valueObj]) => {
                      if (!valueObj || typeof valueObj !== 'object') return null;
                      const { value, data_check } = valueObj as { value: unknown; data_check?: unknown };

                      return (
                        <div key={key} className="border-b border-gray-100 pb-2 last:border-0">
                          <div className="font-medium text-gray-700 mb-1 text-sm">
                            {key
                              .replace(/_one$/, '')
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </div>
                          <div className="text-gray-900 mb-1">{renderValue(value)}</div>
                          {data_check !== null && data_check !== undefined && (
                            <div className="mt-1 p-2 bg-blue-50 rounded text-xs text-blue-800">
                              <span className="font-medium">Evidence: </span>
                              {typeof data_check === 'string' ? data_check : renderValue(data_check)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Secondary Account Holder (if exists) */}
                {hasHolderTwo && (
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-3">
                      Secondary Account Holder (Joint Account)
                    </h4>
                    <div className="space-y-3">
                      {holderTwoFields.map(([key, valueObj]) => {
                        if (!valueObj || typeof valueObj !== 'object') return null;
                        const { value, data_check } = valueObj as { value: unknown; data_check?: unknown };

                        // Skip if no value
                        if (value === null || value === undefined || value === '') return null;

                        return (
                          <div key={key} className="border-b border-gray-100 pb-2 last:border-0">
                            <div className="font-medium text-gray-700 mb-1 text-sm">
                              {key
                                .replace(/_two$/, '')
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (c) => c.toUpperCase())}
                            </div>
                            <div className="text-gray-900 mb-1">{renderValue(value)}</div>
                            {data_check !== null && data_check !== undefined && (
                              <div className="mt-1 p-2 bg-blue-50 rounded text-xs text-blue-800">
                                <span className="font-medium">Evidence: </span>
                                {typeof data_check === 'string' ? data_check : renderValue(data_check)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 italic">No personal information extracted</p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-700">Loading...</div>
        </div>
      </div>
    );
  }

  if (!webhookData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-700 mb-4">No proof-of-address data found</div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Webhook payload structure: { success, requestId, timestamp, data, metadata }
  const body = webhookData.body as Record<string, unknown>;
  const data = (body?.data as Record<string, unknown>) || {};
  const attributes = (data.attributes as Record<string, unknown>) || data;
  const attributeTypes = (attributes.attribute_types as Record<string, unknown>) || {};
  const metadata = (body?.metadata as Record<string, unknown>) || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Proof of Address Document</h1>
            <p className="text-gray-600">Parsed document details and verification results</p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        {/* Processed Document URL */}
        {processedDocUrl && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-medium text-gray-900">Processed Document:</p>
            </div>
            <a
              href={processedDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 underline break-all"
            >
              {processedDocUrl}
            </a>
          </div>
        )}

        {/* Metadata */}
        {metadata && Object.keys(metadata).length > 0 && (
          <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl">
            <h3 className="font-semibold text-green-900 mb-4">Processing Metadata</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {metadata.totalRequestTime !== undefined && (
                <div>
                  <p className="text-xs text-green-700">Total Request Time</p>
                  <p className="text-lg font-semibold text-green-900">{String(metadata.totalRequestTime)}s</p>
                </div>
              )}
              {metadata.aiProcessingTime !== undefined && (
                <div>
                  <p className="text-xs text-green-700">AI Processing Time</p>
                  <p className="text-lg font-semibold text-green-900">{String(metadata.aiProcessingTime)}s</p>
                </div>
              )}
              {metadata.creditsCharged !== undefined && (
                <div>
                  <p className="text-xs text-green-700">Credits Charged</p>
                  <p className="text-lg font-semibold text-green-900">{String(metadata.creditsCharged)}</p>
                </div>
              )}
              {metadata.remainingBalance !== undefined && (
                <div>
                  <p className="text-xs text-green-700">Remaining Balance</p>
                  <p className="text-lg font-semibold text-green-900">{String(metadata.remainingBalance)}</p>
                </div>
              )}
              {metadata.businessId !== null && metadata.businessId !== undefined && (
                <div>
                  <p className="text-xs text-green-700">Business ID</p>
                  <p className="text-sm font-mono text-green-900">{String(metadata.businessId)}</p>
                </div>
              )}
              {metadata.documentPart !== null && metadata.documentPart !== undefined && (
                <div>
                  <p className="text-xs text-green-700">Document Part</p>
                  <p className="text-sm font-mono text-green-900">{String(metadata.documentPart)}</p>
                </div>
              )}
              {body?.requestId !== null && body?.requestId !== undefined && (
                <div className="col-span-2 md:col-span-1">
                  <p className="text-xs text-green-700">Request ID</p>
                  <p className="text-xs font-mono text-green-900 break-all">{String(body.requestId)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Accordion Sections */}
        <div className="space-y-4">
          {/* Pre-Validation */}
          {attributeTypes.pre_validation !== null && attributeTypes.pre_validation !== undefined && (
            <AccordionSection
              title="Pre-Validation"
              icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
              sectionKey="pre_validation"
              data={attributeTypes.pre_validation as Record<string, unknown>}
              bgColor="bg-orange-50"
              borderColor="border-orange-200"
            />
          )}

          {/* Document Provider */}
          {attributeTypes.document_provider !== null && attributeTypes.document_provider !== undefined && (
            <DocumentProviderSection
              data={attributeTypes.document_provider as Record<string, unknown>}
            />
          )}

          {/* Address Information */}
          {attributeTypes.address_information !== null && attributeTypes.address_information !== undefined && (
            <AccordionSection
              title="Address Information"
              icon={<MapPin className="w-5 h-5 text-emerald-600" />}
              sectionKey="address_information"
              data={attributeTypes.address_information as Record<string, unknown>}
              bgColor="bg-emerald-50"
              borderColor="border-emerald-200"
            />
          )}

          {/* Personal Information */}
          {attributeTypes.personal_information !== null && attributeTypes.personal_information !== undefined && (
            <PersonalInformationSection
              data={attributeTypes.personal_information as Record<string, unknown>}
            />
          )}

          {/* Document Age */}
          {attributeTypes.document_age !== null && attributeTypes.document_age !== undefined && (
            <AccordionSection
              title="Document Age"
              icon={<Calendar className="w-5 h-5 text-teal-600" />}
              sectionKey="document_age"
              data={attributeTypes.document_age as Record<string, unknown>}
              bgColor="bg-teal-50"
              borderColor="border-teal-200"
            />
          )}
        </div>

        {/* Raw JSON Toggle */}
        <div className="mt-8">
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <Code className="w-5 h-5" />
            {showRawJson ? 'Hide' : 'Show'} Raw JSON
          </button>

          {showRawJson && (
            <div className="mt-4 bg-gray-900 text-gray-100 rounded-lg p-6 overflow-auto max-h-96">
              <pre className="text-sm">
                {JSON.stringify(body, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
