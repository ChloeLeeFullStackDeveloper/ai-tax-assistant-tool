const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log('🍁 Initializing Canadian Tax Prep AI Backend...');

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Auth rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' }
});

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed'));
    }
  }
});

// In-memory storage
const users = [];
const taxForms = [];
const documents = [];
const chatHistory = [];

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'canadian-tax-secret-2024', { expiresIn: '7d' });
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }
  jwt.verify(token, process.env.JWT_SECRET || 'canadian-tax-secret-2024', (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.userId = decoded.userId;
    next();
  });
};

// Helper functions
const findUserData = async (criteria) => {
  if (criteria.email) {
    return users.find(u => u.email === criteria.email);
  }
  if (criteria.id) {
    return users.find(u => u.id === criteria.id);
  }
  return null;
};

const saveUserData = async (userData) => {
  users.push(userData);
  return userData;
};

// Province information
const getProvinceInfo = (province) => {
  const provinceData = {
    'ON': { name: 'Ontario', basicPersonal: 11865, hst: 13 },
    'BC': { name: 'British Columbia', basicPersonal: 11980, pst: 7, gst: 5 },
    'AB': { name: 'Alberta', basicPersonal: 21003, gst: 5 },
    'SK': { name: 'Saskatchewan', basicPersonal: 17661, pst: 6, gst: 5 },
    'MB': { name: 'Manitoba', basicPersonal: 15000, pst: 7, gst: 5 },
    'QC': { name: 'Quebec', basicPersonal: 18056, qst: 9.975, gst: 5 },
    'NB': { name: 'New Brunswick', basicPersonal: 12458, hst: 15 },
    'NS': { name: 'Nova Scotia', basicPersonal: 8744, hst: 15 },
    'PE': { name: 'Prince Edward Island', basicPersonal: 12500, hst: 15 },
    'NL': { name: 'Newfoundland and Labrador', basicPersonal: 10382, hst: 15 },
    'YT': { name: 'Yukon', basicPersonal: 15705, gst: 5 },
    'NT': { name: 'Northwest Territories', basicPersonal: 16593, gst: 5 },
    'NU': { name: 'Nunavut', basicPersonal: 18767, gst: 5 }
  };
  return provinceData[province] || provinceData['ON'];
};

const getSalesTaxInfo = (province) => {
  const salesTax = {
    'ON': 'HST: 13%', 'BC': 'GST: 5% + PST: 7%', 'AB': 'GST: 5%',
    'SK': 'GST: 5% + PST: 6%', 'MB': 'GST: 5% + PST: 7%',
    'QC': 'GST: 5% + QST: 9.975%', 'NB': 'HST: 15%', 'NS': 'HST: 15%',
    'PE': 'HST: 15%', 'NL': 'HST: 15%', 'YT': 'GST: 5%',
    'NT': 'GST: 5%', 'NU': 'GST: 5%'
  };
  return salesTax[province] || 'GST: 5%';
};

// Tax calculation functions
const getMarginalRate = (taxableIncome) => {
  if (taxableIncome <= 55867) return 15;
  if (taxableIncome <= 111733) return 20.5;
  if (taxableIncome <= 173205) return 26;
  if (taxableIncome <= 246752) return 29;
  return 33;
};

const calculateProvincialTax = (taxableIncome, province) => {
  const provinceInfo = getProvinceInfo(province);
  const provincialTaxable = Math.max(0, taxableIncome - (provinceInfo.basicPersonal - 15705));

  switch (province) {
    case 'ON':
      return provincialTaxable > 0 ? provincialTaxable * 0.0505 : 0;
    case 'AB':
      return provincialTaxable > 0 ? provincialTaxable * 0.10 : 0;
    case 'BC':
      return provincialTaxable > 0 ? provincialTaxable * 0.0506 : 0;
    case 'QC':
      return provincialTaxable > 0 ? provincialTaxable * 0.14 : 0;
    default:
      return provincialTaxable > 0 ? provincialTaxable * 0.075 : 0;
  }
};

const generateTaxOptimizations = (income, taxableIncome, rrspRoom, tfsaRoom) => {
  const optimizations = [];
  let potentialSavings = 0;

  if (rrspRoom > 0) {
    const rrspSavings = rrspRoom * (getMarginalRate(taxableIncome) / 100);
    optimizations.push(`Maximize RRSP contribution: Save $${Math.round(rrspSavings)} in taxes`);
    potentialSavings += rrspSavings;
  }

  if (tfsaRoom > 0) {
    const tfsaGrowth = tfsaRoom * 0.06;
    optimizations.push(`Use TFSA room: $${tfsaRoom} tax-free growth potential`);
    potentialSavings += tfsaGrowth * 0.25;
  }

  if (income > 30000) {
    optimizations.push('Claim home office expenses if working from home');
    potentialSavings += 400;
  }

  return {
    potentialSavings: Math.round(potentialSavings),
    recommendedActions: optimizations,
    confidence: 94
  };
};

// Main Canadian Tax Calculation Function
const calculateCanadianTax = (income, deductions, filingStatus, province = 'ON') => {
  const basicPersonalAmount = 15705;
  const totalDeductions = Math.max(deductions, basicPersonalAmount);
  const taxableIncome = Math.max(0, income - totalDeductions);

  // Federal Tax
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

  // Provincial Tax
  const provincialTax = calculateProvincialTax(taxableIncome, province);

  // CPP and EI
  const cppContribution = Math.min(Math.max(0, income - 3500) * 0.0595, 4055);
  const eiContribution = Math.min(income * 0.0229, 1505);

  const totalTax = federalTax + provincialTax;
  const totalTaxAndContributions = totalTax + cppContribution + eiContribution;
  const effectiveRate = income > 0 ? (totalTaxAndContributions / income) * 100 : 0;
  const rrspRoom = Math.min(income * 0.18, 31560);
  const tfsaRoom = 7000;

  const provinceInfo = getProvinceInfo(province);

  return {
    tax: Math.round(totalTaxAndContributions),
    federalTax: Math.round(federalTax),
    provincialTax: Math.round(provincialTax),
    cppContribution: Math.round(cppContribution),
    eiContribution: Math.round(eiContribution),
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    taxableIncome: Math.round(taxableIncome),
    basicPersonalAmount,
    rrspRoom: Math.round(rrspRoom),
    tfsaRoom,
    marginalRate: getMarginalRate(taxableIncome),
    provinceName: provinceInfo.name,
    salesTax: getSalesTaxInfo(province),
    aiOptimizations: generateTaxOptimizations(income, taxableIncome, rrspRoom, tfsaRoom)
  };
};

// AI Response Generator
const generateEnhancedCanadianTaxResponse = (message, userContext) => {
  const lowerMessage = message.toLowerCase();
  const province = userContext.province || 'ON';
  const income = userContext.income;
  const userName = userContext.userName || 'there';

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return {
      message: `Hello ${userName}! I'm your Canadian AI Tax Assistant specializing in CRA regulations and ${getProvinceInfo(province).name} tax laws. I can help you with tax calculations, RRSP planning, document requirements, and CRA compliance. What tax question can I help you with today?`,
      confidence: 95,
      sources: ['Canadian CRA Tax Expert'],
      aiInsight: true,
      suggestedActions: ['Calculate my taxes', 'RRSP optimization', 'Tax document requirements'],
      responseType: 'canadian_greeting'
    };
  }

  if (lowerMessage.includes('rrsp')) {
    const rrspRoom = income ? Math.min(income * 0.18, 31560) : 31560;
    return {
      message: `Great question about RRSPs! For 2024, the RRSP contribution limit is 18% of your previous year's income, up to $31,560. ${income ? `Based on your income of $${income.toLocaleString()}, your maximum RRSP contribution would be $${rrspRoom.toLocaleString()}.` : `The maximum contribution for 2024 is $31,560.`} Remember, the contribution deadline is March 1, 2025 for the 2024 tax year.`,
      confidence: 92,
      sources: ['CRA RRSP Guidelines 2024'],
      aiInsight: true,
      suggestedActions: ['Calculate exact RRSP room', 'Compare RRSP vs TFSA', 'Set up automatic contributions'],
      responseType: 'canadian_rrsp_advice'
    };
  }

  if (lowerMessage.includes('tfsa')) {
    return {
      message: `TFSA is excellent for tax-free growth! The 2024 contribution limit is $7,000. Unlike RRSPs, TFSA contributions aren't tax-deductible, but all growth and withdrawals are completely tax-free. Your TFSA room accumulates from when you turned 18 and became a Canadian resident.`,
      confidence: 91,
      sources: ['CRA TFSA Guidelines 2024'],
      aiInsight: true,
      suggestedActions: ['Check TFSA contribution room', 'Compare investment options', 'TFSA vs RRSP comparison'],
      responseType: 'canadian_tfsa_advice'
    };
  }

  // Default response
  return {
    message: `That's a great Canadian tax question! As your CRA specialist, I can help you with federal and provincial tax calculations, RRSP and TFSA planning, eligible deductions and credits, tax filing deadlines, and CRA compliance for ${getProvinceInfo(province).name}. What specific Canadian tax topic would you like to explore?`,
    confidence: 85,
    sources: ['Canadian CRA Tax Expert'],
    aiInsight: true,
    suggestedActions: ['Ask about RRSP planning', 'Calculate my taxes', 'Learn about tax credits', 'Check filing requirements'],
    responseType: 'canadian_tax_general'
  };
};

// ROUTES

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Canadian Tax Prep AI API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    country: 'Canada',
    taxYear: '2024'
  });
});

// Authentication routes
app.post('/api/auth/register', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }

  const { name, email, password } = req.body;

  try {
    const existingUser = await findUserData({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = {
      id: generateId(),
      name,
      email,
      password: hashedPassword,
      province: 'ON',
      createdAt: new Date()
    };

    await saveUserData(newUser);
    const token = generateToken(newUser.id);
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
});

app.post('/api/auth/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }

  const { email, password } = req.body;

  try {
    const user = await findUserData({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
});

// Province routes
app.get('/api/provinces', (req, res) => {
  const provinces = [
    { code: 'ON', name: 'Ontario', basicPersonal: 11865, salesTax: 'HST: 13%' },
    { code: 'BC', name: 'British Columbia', basicPersonal: 11980, salesTax: 'GST: 5% + PST: 7%' },
    { code: 'AB', name: 'Alberta', basicPersonal: 21003, salesTax: 'GST: 5%' },
    { code: 'SK', name: 'Saskatchewan', basicPersonal: 17661, salesTax: 'GST: 5% + PST: 6%' },
    { code: 'MB', name: 'Manitoba', basicPersonal: 15000, salesTax: 'GST: 5% + PST: 7%' },
    { code: 'QC', name: 'Quebec', basicPersonal: 18056, salesTax: 'GST: 5% + QST: 9.975%' },
    { code: 'NB', name: 'New Brunswick', basicPersonal: 12458, salesTax: 'HST: 15%' },
    { code: 'NS', name: 'Nova Scotia', basicPersonal: 8744, salesTax: 'HST: 15%' },
    { code: 'PE', name: 'Prince Edward Island', basicPersonal: 12500, salesTax: 'HST: 15%' },
    { code: 'NL', name: 'Newfoundland and Labrador', basicPersonal: 10382, salesTax: 'HST: 15%' },
    { code: 'YT', name: 'Yukon', basicPersonal: 15705, salesTax: 'GST: 5%' },
    { code: 'NT', name: 'Northwest Territories', basicPersonal: 16593, salesTax: 'GST: 5%' },
    { code: 'NU', name: 'Nunavut', basicPersonal: 18767, salesTax: 'GST: 5%' }
  ];

  res.json({
    success: true,
    data: provinces
  });
});

// Tax calculation routes
app.post('/api/tax/calculate-by-province', authenticateToken, [
  body('income').isNumeric(),
  body('deductions').isNumeric(),
  body('province').isLength({ min: 2, max: 2 }),
  body('filingStatus').isIn(['single', 'married_joint', 'married_separate', 'head_of_household'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }

  try {
    const { income, deductions, province, filingStatus } = req.body;

    const calculation = calculateCanadianTax(
      parseFloat(income),
      parseFloat(deductions),
      filingStatus,
      province.toUpperCase()
    );

    const enhancedCalculation = {
      ...calculation,
      inputData: {
        income: parseFloat(income),
        deductions: parseFloat(deductions),
        province: province.toUpperCase(),
        filingStatus
      }
    };

    res.json({
      success: true,
      data: enhancedCalculation
    });
  } catch (error) {
    console.error('Tax calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Tax calculation failed. Please try again.'
    });
  }
});

app.post('/api/tax/compare-provinces', authenticateToken, [
  body('income').isNumeric(),
  body('deductions').isNumeric(),
  body('provinces').isArray().isLength({ min: 2, max: 5 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }

  try {
    const { income, deductions, provinces } = req.body;
    const filingStatus = 'single';

    const comparisons = provinces.map(province => {
      const calculation = calculateCanadianTax(
        parseFloat(income),
        parseFloat(deductions),
        filingStatus,
        province
      );

      return {
        province: province,
        provinceName: calculation.provinceName,
        totalTax: calculation.tax,
        federalTax: calculation.federalTax,
        provincialTax: calculation.provincialTax,
        netIncome: parseFloat(income) - calculation.tax,
        marginalRate: calculation.marginalRate,
        basicPersonal: getProvinceInfo(province).basicPersonal,
        salesTax: getSalesTaxInfo(province)
      };
    });

    const sortedByTax = [...comparisons].sort((a, b) => a.totalTax - b.totalTax);
    const bestProvince = sortedByTax[0];
    const worstProvince = sortedByTax[sortedByTax.length - 1];
    const savings = worstProvince.totalTax - bestProvince.totalTax;

    res.json({
      success: true,
      data: {
        comparisons,
        summary: {
          income: parseFloat(income),
          bestProvince: {
            province: bestProvince.province,
            name: bestProvince.provinceName,
            totalTax: bestProvince.totalTax,
            netIncome: bestProvince.netIncome
          },
          worstProvince: {
            province: worstProvince.province,
            name: worstProvince.provinceName,
            totalTax: worstProvince.totalTax,
            netIncome: worstProvince.netIncome
          },
          potentialSavings: Math.round(savings),
          recommendations: ['Consider provincial tax differences when relocating']
        }
      }
    });
  } catch (error) {
    console.error('Province comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Province comparison failed. Please try again.'
    });
  }
});

// AI Chat route
app.post('/api/ai/chat', authenticateToken, [
  body('message').trim().isLength({ min: 1 }),
  body('context').optional().isObject()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }

  try {
    const { message, context = {} } = req.body;
    const user = await findUserData({ id: req.userId });

    const userContext = {
      province: user?.province || context.selectedProvince || 'ON',
      income: context.taxFormData?.income || null,
      filingStatus: context.taxFormData?.filingStatus || null,
      hasDocuments: (context.documentsCount || 0) > 0,
      documentCount: context.documentsCount || 0,
      userName: user?.name,
      ...context
    };

    const aiResponse = generateEnhancedCanadianTaxResponse(message, userContext);

    res.json({
      success: true,
      data: {
        message: aiResponse.message,
        confidence: aiResponse.confidence,
        sources: aiResponse.sources,
        aiInsight: aiResponse.aiInsight,
        suggestedActions: aiResponse.suggestedActions,
        responseType: aiResponse.responseType,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      message: 'AI chat service temporarily unavailable'
    });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error.message);
  res.status(500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`\n🍁 Canadian Tax Prep AI Backend Server is running on port ${PORT}!`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🏛️ Tax System: Canada Revenue Agency (CRA) 2024`);
  console.log(`🤖 AI Features: Enhanced Canadian Tax Intelligence`);
  console.log('\n✅ Ready to accept Canadian tax calculations!\n');
});

module.exports = app;