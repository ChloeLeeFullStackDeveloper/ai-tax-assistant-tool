// utils/taxCalculations.ts - Complete Canadian Tax Calculation Utilities
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

// Provincial tax rates (simplified - average effective rates)
export const PROVINCIAL_TAX_RATES = {
  ontario: 0.10,
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

    const bracketWidth = bracket.max === Infinity ? remainingIncome : bracket.max - bracket.min;
    const taxableAtBracket = Math.min(remainingIncome, bracketWidth);
    tax += taxableAtBracket * bracket.rate;
    remainingIncome -= taxableAtBracket;
  }

  return Math.max(0, tax);
};

/**
 * Calculate CPP contributions for 2024
 */
export const calculateCPP = (income: number): number => {
  const { maxEarnings, exemption, rate } = TAX_BRACKETS_2024.cpp;
  const pensionableEarnings = Math.max(0, Math.min(income, maxEarnings) - exemption);
  return pensionableEarnings * rate;
};

/**
 * Calculate EI premiums for 2024
 */
export const calculateEI = (income: number): number => {
  const { maxEarnings, rate } = TAX_BRACKETS_2024.ei;
  const insutableEarnings = Math.min(income, maxEarnings);
  return insutableEarnings * rate;
};

/**
 * Calculate provincial tax (simplified average rates)
 */
export const calculateProvincialTax = (taxableIncome: number, province: string = 'ontario'): number => {
  const rate = PROVINCIAL_TAX_RATES[province as keyof typeof PROVINCIAL_TAX_RATES] || PROVINCIAL_TAX_RATES.ontario;
  return Math.max(0, taxableIncome * rate);
};

/**
 * Main Canadian tax calculation function
 */
export const calculateCanadianTax = (taxFormData: TaxFormData, province: string = 'ontario'): TaxResults => {
  const income = parseFloat(taxFormData.income) || 0;
  const deductions = parseFloat(taxFormData.deductions) || 0;
  
  // Calculate taxable income (minimum is basic personal amount)
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
  const estimatedWithholding = income * 0.18; // Average withholding estimate
  const estimatedRefund = Math.max(0, estimatedWithholding - totalTaxAndContributions);
  
  return {
    tax: Math.round(totalTaxAndContributions),
    taxableIncome: Math.round(taxableIncome),
    effectiveRate: Number(effectiveRate.toFixed(2)),
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
export const calculateRRSPOptimization = (
  income: number, 
  currentRRSPContribution: number = 0
): { 
  maxContribution: number; 
  remainingRoom: number;
  taxSavings: number; 
  marginalRate: number 
} => {
  const maxRRSPContribution = Math.min(income * 0.18, TAX_BRACKETS_2024.rrspLimit);
  const remainingRoom = Math.max(0, maxRRSPContribution - currentRRSPContribution);
  
  // Determine marginal tax rate based on income (federal + provincial average)
  let marginalRate = 0.25; // Default combined rate
  
  if (income > 246752) marginalRate = 0.43; // 33% + 10% provincial
  else if (income > 173205) marginalRate = 0.39; // 29% + 10% provincial
  else if (income > 111733) marginalRate = 0.36; // 26% + 10% provincial
  else if (income > 55867) marginalRate = 0.305; // 20.5% + 10% provincial
  else marginalRate = 0.25; // 15% + 10% provincial
  
  const taxSavings = remainingRoom * marginalRate;
  
  return {
    maxContribution: Math.round(maxRRSPContribution),
    remainingRoom: Math.round(remainingRoom),
    taxSavings: Math.round(taxSavings),
    marginalRate: Number((marginalRate * 100).toFixed(1))
  };
};

/**
 * Calculate TFSA optimization potential
 */
export const calculateTFSAOptimization = (
  currentTFSAContribution: number = 0,
  expectedReturn: number = 0.06
): { 
  remainingRoom: number; 
  projectedGrowth: number;
  taxFreeGains: number;
} => {
  const remainingRoom = Math.max(0, TAX_BRACKETS_2024.tfsaLimit - currentTFSAContribution);
  const projectedGrowth = remainingRoom * expectedReturn;
  const taxFreeGains = projectedGrowth; // All growth is tax-free in TFSA
  
  return {
    remainingRoom: Math.round(remainingRoom),
    projectedGrowth: Math.round(projectedGrowth),
    taxFreeGains: Math.round(taxFreeGains)
  };
};

/**
 * Validate tax form data with Canadian-specific rules
 */
export const validateTaxFormData = (taxFormData: TaxFormData): { 
  isValid: boolean; 
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const income = parseFloat(taxFormData.income);
  const deductions = parseFloat(taxFormData.deductions);
  
  // Income validation
  if (isNaN(income) || income < 0) {
    errors.push('Income must be a valid positive number');
  } else {
    if (income > 1000000) {
      warnings.push('Income exceeds $1M - ensure all T4/T5 slips are included');
    }
    if (income > 0 && income < 1000) {
      warnings.push('Income appears low - verify all income sources are included');
    }
  }
  
  // Deductions validation
  if (deductions && (isNaN(deductions) || deductions < 0)) {
    errors.push('Deductions must be a valid positive number');
  } else if (deductions) {
    if (deductions > income) {
      errors.push('Total deductions cannot exceed income');
    }
    if (deductions < TAX_BRACKETS_2024.basicPersonalAmount && income > 0) {
      warnings.push(`Consider claiming Basic Personal Amount of $${TAX_BRACKETS_2024.basicPersonalAmount.toLocaleString()}`);
    }
  }
  
  // Tax year validation
  if (!['2022', '2023', '2024'].includes(taxFormData.taxYear)) {
    errors.push('Please select a valid tax year (2022-2024)');
  }
  
  // Filing status validation
  const validStatuses = ['single', 'married_joint', 'married_separate', 'head_of_household'];
  if (!validStatuses.includes(taxFormData.filingStatus)) {
    errors.push('Please select a valid filing status');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Format currency for Canadian display
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
 * Get tax bracket information for given income
 */
export const getTaxBracketInfo = (income: number): {
  federalBracket: { rate: number; min: number; max: number };
  marginalRate: number;
  nextBracketAt: number | null;
} => {
  let federalBracket = TAX_BRACKETS_2024.federal[0];
  let nextBracketAt: number | null = null;
  
  for (let i = 0; i < TAX_BRACKETS_2024.federal.length; i++) {
    const bracket = TAX_BRACKETS_2024.federal[i];
    if (income >= bracket.min && (bracket.max === Infinity || income < bracket.max)) {
      federalBracket = bracket;
      if (i < TAX_BRACKETS_2024.federal.length - 1) {
        nextBracketAt = TAX_BRACKETS_2024.federal[i + 1].min;
      }
      break;
    }
  }
  
  const marginalRate = (federalBracket.rate + 0.10) * 100; // Adding average provincial rate
  
  return {
    federalBracket,
    marginalRate: Number(marginalRate.toFixed(1)),
    nextBracketAt
  };
};