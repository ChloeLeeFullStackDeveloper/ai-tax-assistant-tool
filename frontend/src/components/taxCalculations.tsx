// utils/taxCalculations.ts - Canadian Tax Calculation Utilities
import { TaxFormData, TaxResults } from '../types';

// 2024 Canadian Tax Brackets and Rates
export const TAX_BRACKETS_2024 = {
  federal: [
    { min: 0, max: 55867, rate: 0.15 },
    { min: 55867, max: 111733, rate: 0.205 },
    { min: 111733, max: 173205, rate: 0.26 },
    { min: 173205, max: 246752, rate: 0.29 },
    { min: 246752, max: Infinity, rate: 0.33 }
  ],
  basicPersonalAmount: 15705,
  rrspLimit: 31560,
  tfsaLimit: 7000,
  cpp: {
    maxEarnings: 68500,
    exemption: 3500,
    rate: 0.0595
  },
  ei: {
    maxEarnings: 65700,
    rate: 0.0229
  }
};

// Provincial tax rates (simplified - Ontario as default)
export const PROVINCIAL_TAX_RATES = {
  ontario: 0.10, // Simplified average rate
  quebec: 0.12,
  british_columbia: 0.095,
  alberta: 0.08,
  manitoba: 0.105,
  saskatchewan: 0.095,
  nova_scotia: 0.11,
  new_brunswick: 0.105,
  newfoundland: 0.115,
  pei: 0.105,
  northwest_territories: 0.09,
  nunavut: 0.09,
  yukon: 0.085
};

/**
 * Calculate Canadian federal tax based on 2024 brackets
 */
export const calculateFederalTax = (taxableIncome: number): number => {
  let tax = 0;
  let remainingIncome = taxableIncome;

  for (const bracket of TAX_BRACKETS_2024.federal) {
    if (remainingIncome <= 0) break;

    const taxableAtBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    tax += taxableAtBracket * bracket.rate;
    remainingIncome -= taxableAtBracket;
  }

  return tax;
};

/**
 * Calculate CPP contributions
 */
export const calculateCPP = (income: number): number => {
  const { maxEarnings, exemption, rate } = TAX_BRACKETS_2024.cpp;
  const pensionableEarnings = Math.max(0, Math.min(income, maxEarnings) - exemption);
  return pensionableEarnings * rate;
};

/**
 * Calculate EI premiums
 */
export const calculateEI = (income: number): number => {
  const { maxEarnings, rate } = TAX_BRACKETS_2024.ei;
  const insutableEarnings = Math.min(income, maxEarnings);
  return insutableEarnings * rate;
};

/**
 * Calculate provincial tax (simplified)
 */
export const calculateProvincialTax = (taxableIncome: number, province: string = 'ontario'): number => {
  const rate = PROVINCIAL_TAX_RATES[province as keyof typeof PROVINCIAL_TAX_RATES] || PROVINCIAL_TAX_RATES.ontario;
  return taxableIncome * rate;
};

/**
 * Main tax calculation function
 */
export const calculateCanadianTax = (taxFormData: TaxFormData, province: string = 'ontario'): TaxResults => {
  const income = parseFloat(taxFormData.income) || 0;
  const deductions = parseFloat(taxFormData.deductions) || 0;
  
  // Calculate taxable income
  const totalDeductions = Math.max(deductions, TAX_BRACKETS_2024.basicPersonalAmount);
  const taxableIncome = Math.max(0, income - totalDeductions);
  
  // Calculate taxes and contributions
  const federalTax = calculateFederalTax(taxableIncome);
  const provincialTax = calculateProvincialTax(taxableIncome, province);
  const cppContribution = calculateCPP(income);
  const eiContribution = calculateEI(income);
  
  const totalTax = federalTax + provincialTax;
  const totalTaxAndContributions = totalTax + cppContribution + eiContribution;
  
  // Calculate effective rate and estimated refund
  const effectiveRate = income > 0 ? (totalTaxAndContributions / income) * 100 : 0;
  const estimatedWithholding = income * 0.18; // Estimate based on average withholding
  const estimatedRefund = Math.max(0, estimatedWithholding - totalTaxAndContributions);
  
  return {
    tax: Math.round(totalTaxAndContributions),
    taxableIncome: Math.round(taxableIncome),
    effectiveRate: effectiveRate,
    estimatedRefund: Math.round(estimatedRefund),
    federalTax: Math.round(federalTax),
    provincialTax: Math.round(provincialTax),
    cppContribution: Math.round(cppContribution),
    eiContribution: Math.round(eiContribution)
  };
};

/**
 * Calculate RRSP optimization potential
 */
export const calculateRRSPOptimization = (income: number, currentRRSPContribution: number = 0): { maxContribution: number; taxSavings: number; marginalRate: number } => {
  const maxRRSPContribution = Math.min(income * 0.18, TAX_BRACKETS_2024.rrspLimit);
  const additionalContribution = Math.max(0, maxRRSPContribution - currentRRSPContribution);
  
  // Determine marginal tax rate based on income
  let marginalRate = 0.15; // Default to lowest bracket
  
  if (income > 246752) marginalRate = 0.33 + 0.10; // Federal + Provincial
  else if (income > 173205) marginalRate = 0.29 + 0.10;
  else if (income > 111733) marginalRate = 0.26 + 0.10;
  else if (income > 55867) marginalRate = 0.205 + 0.10;
  else marginalRate = 0.15 + 0.10;
  
  const taxSavings = additionalContribution * marginalRate;
  
  return {
    maxContribution: Math.round(maxRRSPContribution),
    taxSavings: Math.round(taxSavings),
    marginalRate: marginalRate
  };
};

/**
 * Calculate TFSA optimization
 */
export const calculateTFSAOptimization = (currentTFSAContribution: number = 0): { remainingRoom: number; projectedGrowth: number } => {
  const remainingRoom = Math.max(0, TAX_BRACKETS_2024.tfsaLimit - currentTFSAContribution);
  const projectedGrowth = remainingRoom * 0.06; // Assume 6% annual growth
  
  return {
    remainingRoom,
    projectedGrowth: Math.round(projectedGrowth)
  };
};

/**
 * Validate tax form data
 */
export const validateTaxFormData = (taxFormData: TaxFormData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  const income = parseFloat(taxFormData.income);
  const deductions = parseFloat(taxFormData.deductions);
  
  if (isNaN(income) || income < 0) {
    errors.push('Income must be a valid positive number');
  }
  
  if (income > 10000000) {
    errors.push('Income seems unusually high. Please verify the amount.');
  }
  
  if (deductions && (isNaN(deductions) || deductions < 0)) {
    errors.push('Deductions must be a valid positive number');
  }
  
  if (deductions > income) {
    errors.push('Deductions cannot exceed total income');
  }
  
  if (!['2022', '2023', '2024'].includes(taxFormData.taxYear)) {
    errors.push('Please select a valid tax year');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number, includeCents: boolean = false): string => {
  const formatter = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: includeCents ? 2 : 0,
    maximumFractionDigits: includeCents ? 2 : 0
  });
  
  return formatter.format(amount);
};

/**
 * Calculate tax efficiency score
 */
export const calculateTaxEfficiencyScore = (taxFormData: TaxFormData): { score: number; recommendations: string[] } => {
  const income = parseFloat(taxFormData.income) || 0;
  const deductions = parseFloat(taxFormData.deductions) || 0;
  
  let score = 50; // Base score
  const recommendations: string[] = [];
  
  // Check RRSP optimization
  const rrspOptimal = income * 0.18;
  if (deductions < rrspOptimal) {
    score -= 20;
    recommendations.push('Consider maximizing your RRSP contribution for tax savings');
  } else {
    score += 15;
  }
  
  // Check if using basic personal amount
  if (deductions >= TAX_BRACKETS_2024.basicPersonalAmount) {
    score += 10;
  }
  
  // Income efficiency check
  if (income > 100000 && deductions < income * 0.15) {
    score -= 15;
    recommendations.push('High earners should explore more tax deduction strategies');
  }
  
  // Additional recommendations based on income level
  if (income > 50000) {
    recommendations.push('Consider TFSA contributions for tax-free growth');
  }
  
  if (income > 100000) {
    recommendations.push('Explore income splitting strategies with spouse');
    recommendations.push('Consider tax-efficient investment options');
  }
  
  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));
  
  return {
    score: Math.round(score),
    recommendations: recommendations.slice(0, 3) // Limit to top 3 recommendations
  };
};

/**
 * Generate tax planning timeline
 */
export const generateTaxTimeline = (): { month: string; task: string; priority: 'high' | 'medium' | 'low' }[] => {
  const currentMonth = new Date().getMonth();
  
  const timeline = [
    { month: 'January', task: 'Organize tax documents (T4, T5, receipts)', priority: 'high' as const },
    { month: 'February', task: 'Maximize RRSP contributions (deadline Mar 1)', priority: 'high' as const },
    { month: 'March', task: 'File tax return (deadline Apr 30)', priority: 'high' as const },
    { month: 'April', task: 'Review and submit final tax return', priority: 'high' as const },
    { month: 'May', task: 'Plan for next year\'s tax strategies', priority: 'medium' as const },
    { month: 'June', task: 'Review investment portfolio tax efficiency', priority: 'medium' as const },
    { month: 'July', task: 'Mid-year tax planning review', priority: 'low' as const },
    { month: 'August', task: 'Back-to-school tax credit planning', priority: 'low' as const },
    { month: 'September', task: 'Charitable donation planning', priority: 'medium' as const },
    { month: 'October', task: 'Year-end tax loss harvesting', priority: 'medium' as const },
    { month: 'November', task: 'Review pension and RRIF withdrawals', priority: 'medium' as const },
    { month: 'December', task: 'Final RRSP contributions for current year', priority: 'high' as const }
  ];
  
  // Sort by relevance to current month
  return timeline.sort((a, b) => {
    const aDistance = Math.abs(timeline.findIndex(t => t.month === a.month) - currentMonth);
    const bDistance = Math.abs(timeline.findIndex(t => t.month === b.month) - currentMonth);
    return aDistance - bDistance;
  });
};

/**
 * Calculate audit risk score
 */
export const calculateAuditRisk = (taxFormData: TaxFormData): { score: number; riskLevel: 'low' | 'medium' | 'high'; factors: string[] } => {
  const income = parseFloat(taxFormData.income) || 0;
  const deductions = parseFloat(taxFormData.deductions) || 0;
  
  let riskScore = 0;
  const factors: string[] = [];
  
  // High income increases audit risk
  if (income > 200000) {
    riskScore += 2;
    factors.push('High income bracket');
  }
  
  // High deduction ratio
  const deductionRatio = income > 0 ? deductions / income : 0;
  if (deductionRatio > 0.3) {
    riskScore += 3;
    factors.push('High deduction-to-income ratio');
  }
  
  // Business income (simplified check)
  if (taxFormData.filingStatus === 'single' && income > 100000) {
    riskScore += 1;
    factors.push('Potential self-employment income');
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (riskScore <= 2) riskLevel = 'low';
  else if (riskScore <= 4) riskLevel = 'medium';
  else riskLevel = 'high';
  
  return {
    score: riskScore,
    riskLevel,
    factors
  };
};