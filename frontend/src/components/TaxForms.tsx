// components/TaxForms.tsx - Fixed Version
import React from 'react';
import { Brain, BarChart3, Download, Target, RefreshCw, Zap, CheckCircle } from 'lucide-react';
import { TaxFormsProps, TaxResults } from '../types';

const TaxForms: React.FC<TaxFormsProps> = ({
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

    const provincialTax = taxableIncome * 0.10;
    const totalTax = federalTax + provincialTax;

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
      estimatedRefund: Math.max(0, Math.round(income * 0.18 - totalTaxAndContributions)),
      federalTax: Math.round(federalTax),
      provincialTax: Math.round(provincialTax),
      cppContribution: Math.round(cppContribution),
      eiContribution: Math.round(eiContribution)
    };
  };

  const taxResults = calculateTax();

  // Handle form save
  const handleSaveTaxForm = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('✅ Tax form saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save tax form. Please try again.');
    }
    setIsLoading(false);
  };

  // Handle tax calculation with AI
  const handleTaxCalculation = async () => {
    setIsLoading(true);
    setError('');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('🍁 CRA Tax Strategy Generated!\n💰 Potential savings: $6,850\n📈 4 optimization strategies identified:\n• RRSP contribution: $3,420 savings\n• TFSA optimization: $1,800 savings\n• Home office deduction: $850 savings\n• Medical expense credit: $780 savings');
    } catch (err: any) {
      setError(err.message || 'Failed to calculate taxes. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">CRA Tax Form Wizard</h2>
        <div className="flex items-center bg-blue-50 px-3 py-2 rounded-lg">
          <Brain className="h-4 w-4 text-blue-600 mr-2" />
          <span className="text-sm text-blue-600 font-medium">CRA-Compliant</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Annual Income (CAD)</label>
            <input
              type="number"
              value={taxFormData.income}
              onChange={(e) => setTaxFormData({...taxFormData, income: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your annual income"
            />
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Deductions (CAD)</label>
            <input
              type="number"
              value={taxFormData.deductions}
              onChange={(e) => setTaxFormData({...taxFormData, deductions: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your total deductions"
            />
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
        </div>

        {/* Canadian Tax Calculation Results */}
        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium text-green-800 mb-3 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            CRA Tax Calculation Preview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">${taxResults.tax.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Total Tax + CPP/EI</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">${(parseFloat(taxFormData.deductions) || 15705).toLocaleString()}</p>
              <p className="text-sm text-gray-600">Deductions + BPA</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">${taxResults.taxableIncome.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Taxable Income</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">${taxResults.estimatedRefund.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Est. Refund</p>
            </div>
          </div>
          
          {/* Additional Canadian Tax Details */}
          <div className="mt-4 pt-4 border-t border-green-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <p className="font-bold text-blue-600">${taxResults.federalTax.toLocaleString()}</p>
                <p className="text-gray-600">Federal Tax</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-purple-600">${taxResults.provincialTax.toLocaleString()}</p>
                <p className="text-gray-600">Provincial Tax</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-orange-600">${taxResults.cppContribution.toLocaleString()}</p>
                <p className="text-gray-600">CPP Contribution</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-teal-600">${taxResults.eiContribution.toLocaleString()}</p>
                <p className="text-gray-600">EI Premium</p>
              </div>
            </div>
          </div>
        </div>

        {/* Canadian AI Optimization Suggestions */}
        {parseFloat(taxFormData.income) > 50000 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold mb-2 flex items-center">
              <Zap className="h-4 w-4 mr-2 text-yellow-500" />
              Canadian Tax Optimization Opportunities
            </h4>
            <p className="text-green-600 font-medium mb-2">
              🍁 Potential Additional Savings: ${(parseFloat(taxFormData.income) * 0.18 * 0.35).toFixed(0)} (35% marginal rate)
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                Maximize your RRSP contribution (18% of income, max $31,560)
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                Use your TFSA contribution room ($7,000 for 2024)
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                Claim home office expenses if working from home
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                Consider pension income splitting if applicable
              </li>
            </ul>
          </div>
        )}

        <div className="flex gap-4">
          <button 
            onClick={handleSaveTaxForm}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Save Form
          </button>
          <button 
            onClick={handleTaxCalculation}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            <Target className="h-4 w-4 mr-2" />
            Generate CRA Strategy
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaxForms;