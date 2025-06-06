import React, { useState, useEffect } from 'react';
import { Calculator, MapPin, TrendingUp, DollarSign, FileText, Users } from 'lucide-react';

interface Province {
  code: string;
  name: string;
  basicPersonal: number;
  salesTax: string;
}

interface TaxResult {
  tax: number;
  federalTax: number;
  provincialTax: number;
  cppContribution: number;
  eiContribution: number;
  refund: number;
  effectiveRate: number;
  taxableIncome: number;
  basicPersonalAmount: number;
  rrspRoom: number;
  tfsaRoom: number;
  marginalRate: number;
  provinceName: string;
  salesTax: string;
  inputData: {
    income: number;
    deductions: number;
    province: string;
    filingStatus: string;
  };
}

interface ComparisonData {
  comparisons: Array<{
    province: string;
    provinceName: string;
    totalTax: number;
    federalTax: number;
    provincialTax: number;
    netIncome: number;
    marginalRate: number;
    basicPersonal: number;
    salesTax: string;
  }>;
  summary: {
    income: number;
    bestProvince: {
      province: string;
      name: string;
      totalTax: number;
      netIncome: number;
    };
    worstProvince: {
      province: string;
      name: string;
      totalTax: number;
      netIncome: number;
    };
    potentialSavings: number;
    recommendations: string[];
  };
}

const TaxCalculator: React.FC = () => {
  // State management
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('ON');
  const [income, setIncome] = useState<string>('');
  const [deductions, setDeductions] = useState<string>('15705');
  const [filingStatus, setFilingStatus] = useState<string>('single');
  const [taxResult, setTaxResult] = useState<TaxResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);

  useEffect(() => {
    fetchProvinces();
    // Get user's saved province if logged in
    const savedProvince = localStorage.getItem('userProvince');
    if (savedProvince) {
      setSelectedProvince(savedProvince);
    }
  }, []);

  const fetchProvinces = async (): Promise<void> => {
    try {
      const response = await fetch('http://localhost:3001/api/provinces');
      const data = await response.json();
      if (data.success) {
        setProvinces(data.data);
      }
    } catch (error) {
      console.error('Error fetching provinces:', error);
    }
  };

  const handleProvinceChange = async (provinceCode: string): Promise<void> => {
    setSelectedProvince(provinceCode);
    localStorage.setItem('userProvince', provinceCode);
    
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const response = await fetch('http://localhost:3001/api/user/province', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ province: provinceCode })
        });
        
        if (!response.ok) {
          console.warn('Could not save province preference');
        }
      } catch (error) {
        console.error('Error updating province:', error);
      }
    }
  };

  const calculateTax = async (): Promise<void> => {
    if (!income || parseFloat(income) <= 0) {
      alert('Please enter a valid income amount');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/tax/calculate-by-province', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          income: parseFloat(income),
          deductions: parseFloat(deductions),
          province: selectedProvince,
          filingStatus
        })
      });

      const data = await response.json();
      if (data.success) {
        setTaxResult(data.data);
      } else {
        alert('Error calculating taxes: ' + data.message);
      }
    } catch (error) {
      console.error('Error calculating taxes:', error);
      alert('Error calculating taxes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const compareProvinces = async (): Promise<void> => {
    if (!income || parseFloat(income) <= 0) {
      alert('Please enter an income amount first');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const selectedProvinces = ['ON', 'BC', 'AB', 'QC']; // Top 4 provinces
      
      const response = await fetch('http://localhost:3001/api/tax/compare-provinces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          income: parseFloat(income),
          deductions: parseFloat(deductions),
          provinces: selectedProvinces
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setComparisonData(data.data);
        setShowComparison(true);
      }
    } catch (error) {
      console.error('Error comparing provinces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProvinceFlag = (code: string): string => {
    const flags: Record<string, string> = {
      'ON': '🍁', 'BC': '🏔️', 'AB': '⛽', 'SK': '🌾', 'MB': '🦬',
      'QC': '⚜️', 'NB': '🦞', 'NS': '🦞', 'PE': '🥔', 'NL': '🐟',
      'YT': '❄️', 'NT': '💎', 'NU': '🐻‍❄️'
    };
    return flags[code] || '🍁';
  };

  const getCurrentProvinceName = (): string => {
    return provinces.find(p => p.code === selectedProvince)?.name || 'Ontario';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🇨🇦 Canadian Tax Calculator</h1>
          <p className="text-xl text-gray-600">Calculate your 2024 taxes for any Canadian province</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Province Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Select Province</h2>
              </div>
              
              <div className="space-y-2">
                {provinces.map((province) => (
                  <button
                    key={province.code}
                    onClick={() => handleProvinceChange(province.code)}
                    className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                      selectedProvince === province.code
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getProvinceFlag(province.code)}</span>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{province.name}</div>
                        <div className="text-xs text-gray-500">
                          Basic: ${province.basicPersonal.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Current Selection */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{getProvinceFlag(selectedProvince)}</span>
                  <div>
                    <p className="font-medium text-blue-900 text-sm">
                      Selected: {getCurrentProvinceName()}
                    </p>
                    <p className="text-xs text-blue-700">
                      Tax calculations for this province
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: Tax Calculator */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center space-x-2 mb-6">
                <Calculator className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Tax Calculator</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Income Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Annual Income
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                    <input
                      type="number"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                      placeholder="75,000"
                    />
                  </div>
                </div>

                {/* Deductions Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Deductions
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                    <input
                      type="number"
                      value={deductions}
                      onChange={(e) => setDeductions(e.target.value)}
                      className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Basic personal amount for {getCurrentProvinceName()}
                  </p>
                </div>

                {/* Filing Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filing Status
                  </label>
                  <select
                    value={filingStatus}
                    onChange={(e) => setFilingStatus(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  >
                    <option value="single">Single</option>
                    <option value="married_joint">Married (Joint)</option>
                    <option value="married_separate">Married (Separate)</option>
                    <option value="head_of_household">Head of Household</option>
                  </select>
                </div>

                {/* Province Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Province/Territory
                  </label>
                  <div className="w-full px-3 py-3 border border-gray-200 rounded-lg bg-gray-50 text-lg flex items-center space-x-2">
                    <span>{getProvinceFlag(selectedProvince)}</span>
                    <span className="font-medium">{getCurrentProvinceName()}</span>
                  </div>
                </div>
              </div>

              {/* Calculate Buttons */}
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={calculateTax}
                  disabled={isLoading || !income}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Calculator className="w-5 h-5" />
                  <span>{isLoading ? 'Calculating...' : 'Calculate Tax'}</span>
                </button>
                
                <button
                  onClick={compareProvinces}
                  disabled={isLoading || !income}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <TrendingUp className="w-5 h-5" />
                  <span>Compare Provinces</span>
                </button>
              </div>

              {/* Tax Results */}
              {taxResult && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span>Tax Calculation Results for {taxResult.provinceName}</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Total Tax</div>
                      <div className="text-xl font-bold text-red-600">
                        ${taxResult.tax.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Net Income</div>
                      <div className="text-xl font-bold text-green-600">
                        ${(taxResult.inputData.income - taxResult.tax).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Effective Rate</div>
                      <div className="text-xl font-bold text-blue-600">
                        {taxResult.effectiveRate}%
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Marginal Rate</div>
                      <div className="text-xl font-bold text-purple-600">
                        {taxResult.marginalRate}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Federal Tax</div>
                      <div className="font-semibold">${taxResult.federalTax.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Provincial Tax</div>
                      <div className="font-semibold">${taxResult.provincialTax.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">CPP + EI</div>
                      <div className="font-semibold">
                        ${(taxResult.cppContribution + taxResult.eiContribution).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* RRSP/TFSA Info */}
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <div className="text-sm font-medium text-yellow-800 mb-2">💡 Optimization Opportunities:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-yellow-700">RRSP Room: </span>
                        <span className="font-semibold">${taxResult.rrspRoom.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-yellow-700">TFSA Room: </span>
                        <span className="font-semibold">${taxResult.tfsaRoom.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Province Comparison Results */}
              {showComparison && comparisonData && (
                <div className="mt-6 bg-white border-2 border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Province Tax Comparison
                  </h3>
                  
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Best Province (Lowest Tax)</div>
                        <div className="font-semibold text-green-700">
                          {comparisonData.summary.bestProvince.name}
                        </div>
                        <div className="text-sm">
                          Total Tax: ${comparisonData.summary.bestProvince.totalTax.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Potential Savings</div>
                        <div className="font-semibold text-blue-700">
                          ${comparisonData.summary.potentialSavings.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">vs highest tax province</div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Province</th>
                          <th className="text-right py-2">Total Tax</th>
                          <th className="text-right py-2">Net Income</th>
                          <th className="text-right py-2">Marginal Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData.comparisons
                          .sort((a, b) => a.totalTax - b.totalTax)
                          .map((comp) => (
                          <tr key={comp.province} className="border-b hover:bg-gray-50">
                            <td className="py-2">
                              <div className="flex items-center space-x-2">
                                <span>{getProvinceFlag(comp.province)}</span>
                                <span className="font-medium">{comp.provinceName}</span>
                              </div>
                            </td>
                            <td className="text-right py-2 font-mono">
                              ${comp.totalTax.toLocaleString()}
                            </td>
                            <td className="text-right py-2 font-mono text-green-600">
                              ${comp.netIncome.toLocaleString()}
                            </td>
                            <td className="text-right py-2">
                              {comp.marginalRate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxCalculator;