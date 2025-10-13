'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown, ChevronUp, Check, X, Shield, User,
  Calendar, AlertTriangle, Eye, ArrowLeft, Code, Car
} from 'lucide-react';

interface WebhookPayload {
  timestamp: string;
  headers: Record<string, string>;
  body: unknown;
  method: string;
  url: string;
}

export default function DrivingLicenceViewPage() {
  const router = useRouter();
  const [webhookData, setWebhookData] = useState<WebhookPayload | null>(null);
  const [processedDocUrl, setProcessedDocUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['pre_validation', 'personal_information'])
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

      // Special handling for driving licence categories
      if (value[0]?.category) {
        return (
          <div className="space-y-3">
            {value.map((cat, idx) => (
              <div key={idx} className="bg-white border border-indigo-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-indigo-900 text-lg">Category {cat.category}</span>
                  {cat.restrictions && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                      Restriction: {cat.restrictions}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {cat.valid_from && (
                    <div>
                      <span className="text-gray-600">Valid From:</span>
                      <span className="ml-2 font-medium">{cat.valid_from}</span>
                    </div>
                  )}
                  {cat.valid_to && (
                    <div>
                      <span className="text-gray-600">Valid To:</span>
                      <span className="ml-2 font-medium">{cat.valid_to}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }

      // Special handling for holograms
      if (value[0]?.hologram_name) {
        return (
          <div className="space-y-2">
            {value.map((hologram, idx) => (
              <div key={idx} className="bg-white border border-purple-200 rounded-lg p-2">
                <div className="font-medium text-purple-900">{hologram.hologram_name}</div>
                <div className="text-sm text-gray-600">Location: {hologram.location}</div>
              </div>
            ))}
          </div>
        );
      }

      // Default array rendering
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
          <div className="text-2xl font-semibold text-gray-700 mb-4">No driving licence data found</div>
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
  const attributes = (data.attributes as Record<string, unknown>) || data; // Handle both formats
  const attributeTypes = (attributes.attribute_types as Record<string, unknown>) || {};
  const metadata = (body?.metadata as Record<string, unknown>) || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Driving Licence Document</h1>
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

          {/* Security Assessment */}
          {attributeTypes.security_assessment !== null && attributeTypes.security_assessment !== undefined && (
            <AccordionSection
              title="Security Assessment"
              icon={<Shield className="w-5 h-5 text-red-600" />}
              sectionKey="security_assessment"
              data={attributeTypes.security_assessment as Record<string, unknown>}
              bgColor="bg-red-50"
              borderColor="border-red-200"
            />
          )}

          {/* Personal Information */}
          {attributeTypes.personal_information !== null && attributeTypes.personal_information !== undefined && (
            <AccordionSection
              title="Personal Information"
              icon={<User className="w-5 h-5 text-blue-600" />}
              sectionKey="personal_information"
              data={attributeTypes.personal_information as Record<string, unknown>}
              bgColor="bg-blue-50"
              borderColor="border-blue-200"
            />
          )}

          {/* Document Details */}
          {attributeTypes.document_details !== null && attributeTypes.document_details !== undefined && (
            <AccordionSection
              title="Document Details"
              icon={<Car className="w-5 h-5 text-purple-600" />}
              sectionKey="document_details"
              data={attributeTypes.document_details as Record<string, unknown>}
              bgColor="bg-purple-50"
              borderColor="border-purple-200"
            />
          )}

          {/* Validity Status */}
          {attributeTypes.validity_status !== null && attributeTypes.validity_status !== undefined && (
            <AccordionSection
              title="Validity Status"
              icon={<Calendar className="w-5 h-5 text-teal-600" />}
              sectionKey="validity_status"
              data={attributeTypes.validity_status as Record<string, unknown>}
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
