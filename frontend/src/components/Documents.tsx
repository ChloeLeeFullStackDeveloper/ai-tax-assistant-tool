import React from 'react';
import { 
  FileText, Eye, Brain, RefreshCw, CheckCircle, AlertCircle, 
  X, Lightbulb, Upload
} from 'lucide-react';
import { DocumentsProps } from '../types.ts';

const Documents: React.FC<DocumentsProps> = ({
  uploadedFiles,
  setUploadedFiles,
  selectedDocument,
  setSelectedDocument,
  setError,
  setIsLoading
}) => {

  // File Upload with Error Handling and Size Limits
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(event.target.files || []);
    
    for (const file of files) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Maximum 10MB allowed.`);
        continue;
      }

      const newFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        type: file.type.includes('pdf') ? 'PDF' : 'Image',
        uploadDate: new Date().toLocaleDateString(),
        status: 'processing' as const
      };

      setUploadedFiles(prev => [...prev, newFile]);
      setIsLoading(true);

      // Simulate AI analysis (replace with real API call)
      setTimeout(() => {
        const analysisResults = {
          documentType: 'T4 Statement of Remuneration',
          confidence: '94%',
          extractedData: { 
            employer: 'TechCorp Inc.', 
            employment_income: '85,000', 
            income_tax_deducted: '18,750',
            cpp_contributions: '3,754',
            ei_premiums: '1,002'
          },
          aiScore: 94,
          riskLevel: 'low' as const,
          recommendations: [
            'Verify all employment income amounts',
            'Check for additional T4s from other employers',
            'Ensure CPP and EI contributions are correct'
          ]
        };

        setUploadedFiles(prev => prev.map(f => 
          f.id === newFile.id 
            ? { ...f, status: 'completed' as const, analysis: analysisResults }
            : f
        ));
        setIsLoading(false);
      }, 2000);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">CRA Document Hub</h2>
        <div className="flex items-center bg-purple-50 px-3 py-2 rounded-lg">
          <Eye className="h-4 w-4 text-purple-600 mr-2" />
          <span className="text-sm text-purple-600 font-medium">T4/T5 OCR + AI Analysis</span>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            multiple
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Drop CRA documents here or click to upload</h3>
            <p className="text-sm text-gray-500">AI will automatically analyze T4, T5, receipts and extract CRA data (Max 10MB per file)</p>
          </label>
        </div>
      </div>

      {/* Document List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Your Documents ({uploadedFiles.length})</h3>
        
        {uploadedFiles.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No CRA documents uploaded yet</p>
            <p className="text-sm text-gray-400">Upload your first T4 or T5 to see AI analysis</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-gray-800">{file.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{file.uploadDate}</span>
                        <span>{file.size}</span>
                        <span className="capitalize">{file.type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {file.status === 'processing' && (
                      <div className="flex items-center bg-yellow-50 px-2 py-1 rounded">
                        <RefreshCw className="animate-spin h-3 w-3 mr-1 text-yellow-600" />
                        <span className="text-xs text-yellow-600">Processing</span>
                      </div>
                    )}
                    
                    {file.status === 'completed' && file.analysis && (
                      <>
                        <div className="flex items-center bg-green-50 px-2 py-1 rounded">
                          <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                          <span className="text-xs text-green-600">Analyzed</span>
                        </div>
                        <div className="flex items-center bg-blue-50 px-2 py-1 rounded">
                          <Brain className="h-3 w-3 mr-1 text-blue-600" />
                          <span className="text-xs text-blue-600">{file.analysis.aiScore}%</span>
                        </div>
                      </>
                    )}

                    {file.status === 'error' && (
                      <div className="flex items-center bg-red-50 px-2 py-1 rounded">
                        <AlertCircle className="h-3 w-3 mr-1 text-red-600" />
                        <span className="text-xs text-red-600">Error</span>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedDocument(file)}
                      className="text-blue-600 hover:text-blue-700 p-1"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {file.analysis && (
                  <div className="mt-3 bg-gray-50 rounded p-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Type: </span>
                        {file.analysis.documentType}
                      </div>
                      <div>
                        <span className="font-medium">Confidence: </span>
                        {file.analysis.confidence}
                      </div>
                      <div>
                        <span className="font-medium">Risk: </span>
                        <span className={`${
                          file.analysis.riskLevel === 'low' ? 'text-green-600' :
                          file.analysis.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {file.analysis.riskLevel.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Detail Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Document Analysis Details</h3>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 rounded p-4">
                  <h4 className="font-medium mb-2">Document Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{selectedDocument.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Size:</span>
                      <span className="ml-2 font-medium">{selectedDocument.size}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium">{selectedDocument.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Upload Date:</span>
                      <span className="ml-2 font-medium">{selectedDocument.uploadDate}</span>
                    </div>
                  </div>
                </div>

                {selectedDocument.analysis && (
                  <>
                    <div className="bg-green-50 rounded p-4">
                      <h4 className="font-medium mb-2">AI Analysis Results</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Document Type:</span>
                          <span className="ml-2 font-medium">{selectedDocument.analysis.documentType}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">AI Confidence:</span>
                          <span className="ml-2 font-medium">{selectedDocument.analysis.confidence}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">AI Score:</span>
                          <span className="ml-2 font-medium">{selectedDocument.analysis.aiScore}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Risk Level:</span>
                          <span className={`ml-2 font-medium ${
                            selectedDocument.analysis.riskLevel === 'low' ? 'text-green-600' :
                            selectedDocument.analysis.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {selectedDocument.analysis.riskLevel.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded p-4">
                      <h4 className="font-medium mb-2">Extracted Data</h4>
                      <div className="text-sm space-y-1">
                        {Object.entries(selectedDocument.analysis.extractedData).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-yellow-50 rounded p-4">
                      <h4 className="font-medium mb-2 flex items-center">
                        <Lightbulb className="h-4 w-4 mr-1 text-yellow-500" />
                        AI Recommendations
                      </h4>
                      <ul className="text-sm space-y-1">
                        {selectedDocument.analysis.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="h-3 w-3 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;