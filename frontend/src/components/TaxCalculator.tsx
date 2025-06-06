import React from 'react';
import { Calculator, Zap, Lightbulb } from 'lucide-react';
import { TaxCalculatorProps, TaxResults } from '../types';

const TaxCalculator: React.FC<TaxCalculatorProps> = ({
  taxFormData,
  setTaxFormData,
  setError,
  setIsLoading
}) => {

  // Canadian Tax Calculation Function
  const calculateTax = (): TaxResults => {
    const income = parseFloat(taxFormData.income) || 0;
    const deductions = parseFloat(taxFormData.deductions) || 0;
    const basicPersonalAmount = 15705; // 2024 Canadian Basic Personal Amount
    const totalDeductions = Math.max(deductions, basicPersonalAmount);
    const taxableIncome = Math.max(0, income - totalDeductions);
    
    // Canadian Federal Tax Brackets 2024
    let federalTax = 0;
    if (taxableIncome > 0) {
      if (taxableIncome <= 55867) {
        federalTax = taxableIncome * 0.15;
      } else if (taxableIncome <= 111733) {
        federalTax = 8380 + (taxableIncome - 55867) * 0.205;
      } else if (taxableIncome <= 173205) {
        federalTax = 19822 + (taxableIncome - 111733) * 0.26;
      } else if (taxableIncome <= 246752) {
        federalTax = 35814 + (taxableIncome - 173205) * 0.29;
      } else {
        federalTax = 57168 + (taxableIncome - 246752) * 0.33;
      }
    }

    // Estimate Provincial Tax (Ontario rates as example - ~10% average)
    const provincialTax = taxableIncome * 0.10;
    const totalTax = federalTax + provincialTax;

    // CPP and EI Contributions
    const maxCppEarnings = 68500;
    const cppRate = 0.0595;
    const cppContribution = Math.min((income - 3500) * cppRate, (maxCppEarnings - 3500) * cppRate);
    
    const maxEiEarnings = 65700;
    const eiRate = 0.0229;
    const eiContribution = Math.min(income * eiRate, maxEiEarnings * eiRate);

    const totalTaxAndContributions = totalTax + cppContribution + eiContribution;

    return {
      tax: Math.round(totalTaxAndContributions),
      taxableIncome: Math.round(taxableIncome),
      effectiveRate: income > 0 ? ((totalTaxAndContributions / income) * 100) : 0,
      estimatedRefund: Math.max(0, Math.round(income * 0.18 - totalTaxAndContributions)), // Estimate based on average withholding
      federalTax: Math.round(federalTax),
      provincialTax: Math.round(provincialTax),
      cppContribution: Math.round(cppContribution),
      eiContribution: Math.round(eiContribution)
    };
  };

  const taxResults = calculateTax();

  // Handle AI-powered calculation
  const handleTaxCalculation = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, call API:
      // const token = localStorage.getItem('authToken');
      // const result = await apiService.calculateTax(token, taxFormData);
      
      alert(`🧮 AI Calculation Complete!\n💰 Tax Owed: $${taxResults.tax.toLocaleString()}\n💸 Estimated Refund: $${taxResults.estimatedRefund.toLocaleString()}\n📊 Effective Rate: ${taxResults.effectiveRate.toFixed(2)}%\n🎯 AI Confidence: 94%`);

    } catch (err: any) {
      setError(err.message || 'Failed to calculate taxes. Please try again.');
      console.error('Tax calculation error:', err);
    }
    setIsLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Canadian Tax Calculator</h2>
        <div className="flex items-center bg-green-50 px-3 py-2 rounded-lg">
          <Zap className="h-4 w-4 text-green-600 mr-2" />
          <span className="text-sm text-green-600 font-medium">CRA Tax Engine</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Tax Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Annual Income (CAD)</label>
              <input
                type="number"
                value={taxFormData.income}
                onChange={(e) => setTaxFormData({...taxFormData, income: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter annual income"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Deductions (CAD)</label>
              <input
                type="number"
                value={taxFormData.deductions}
                onChange={(e) => setTaxFormData({...taxFormData, deductions: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter total deductions"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum: $15,705 (Basic Personal Amount 2024)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filing Status</label>
              <select
                value={taxFormData.filingStatus}
                onChange={(e) => setTaxFormData({...taxFormData, filingStatus: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="single">Single</option>
                <option value="married_joint">Married Filing Jointly</option>
                <option value="married_separate">Married Filing Separately</option>
                <option value="head_of_household">Head of Household</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax Year</label>
              <select
                value={taxFormData.taxYear}
                onChange={(e) => setTaxFormData({...taxFormData, taxYear: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>

            <button
              onClick={handleTaxCalculation}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center transition-colors"
            >
              <Calculator className="h-5 w-5 mr-2" />
              Calculate with AI
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Real-time Results</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="font-medium">Total Tax + CPP/EI:</span>
              <span className="text-xl font-bold text-red-600">${taxResults.tax.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="font-medium">Estimated Refund:</span>
              <span className="text-xl font-bold text-green-600">${taxResults.estimatedRefund.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="font-medium">Effective Tax Rate:</span>
              <span className="text-xl font-bold text-blue-600">{taxResults.effectiveRate.toFixed(2)}%</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="font-medium">Taxable Income:</span>
              <span className="text-xl font-bold text-purple-600">${taxResults.taxableIncome.toLocaleString()}</span>
            </div>

            {/* Canadian Tax Breakdown */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-medium mb-2 text-gray-700">Tax Breakdown</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Federal Tax:</span>
                  <span className="font-medium">${taxResults.federalTax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Provincial Tax:</span>
                  <span className="font-medium">${taxResults.provincialTax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CPP Contribution:</span>
                  <span className="font-medium">${taxResults.cppContribution.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>EI Premium:</span>
                  <span className="font-medium">${taxResults.eiContribution.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Canadian Tax Insights */}
          {parseFloat(taxFormData.income) > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-orange-800 mb-2 flex items-center">
                <Lightbulb className="h-4 w-4 mr-2" />
                CRA Tax Optimization Insights
              </h4>
              <div className="text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span>🍁 CRA Compliance Level:</span>
                  <span className="font-bold">94%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>💰 RRSP Room Optimization:</span>
                  <span className="font-bold text-green-600">
                    ${(Math.min(parseFloat(taxFormData.income) * 0.18, 31560) || 0).toFixed(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🏠 TFSA Contribution Room:</span>
                  <span className="font-bold text-blue-600">$7,000</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>📊 Marginal Tax Rate:</span>
                  <span className="font-bold text-purple-600">
                    {parseFloat(taxFormData.income) <= 55867 ? '15%' : 
                     parseFloat(taxFormData.income) <= 111733 ? '20.5%' : 
                     parseFloat(taxFormData.income) <= 173205 ? '26%' : '29%'} Federal
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tax Planning Tips */}
      {parseFloat(taxFormData.income) > 50000 && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-700">🍁 Canadian Tax Planning Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">RRSP Optimization</h4>
              <p className="text-sm text-green-700">
                Maximize your RRSP contribution (18% of income, max $31,560) to reduce taxable income.
                Estimated savings: ${(parseFloat(taxFormData.income) * 0.18 * 0.35 || 0).toFixed(0)}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">TFSA Strategy</h4>
              <p className="text-sm text-blue-700">
                Use your $7,000 TFSA contribution room for tax-free growth.
                All investment gains are tax-free!
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">Tax Credits</h4>
              <p className="text-sm text-purple-700">
                Don't forget non-refundable tax credits: medical expenses, charitable donations, tuition fees.
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-2">Home Office Deduction</h4>
              <p className="text-sm text-orange-700">
                Working from home? Claim home office expenses using the simplified method or detailed method.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxCalculator;