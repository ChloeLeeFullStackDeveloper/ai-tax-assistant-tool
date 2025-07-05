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
const { enhancedCanadianTaxAI } = require('./ai-chatbot');

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
  body('message').trim().isLength({ min: 1, max: 1000 }),
  body('context').optional().isObject()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input',
      errors: errors.array()
    });
  }

  try {
    const { message, context = {} } = req.body;
    const userId = req.userId;

    console.log(`🤖 AI Chat Request from user ${userId}: "${message.substring(0, 50)}..."`);

    // Get user data for context
    const user = await findUserData({ id: userId });

    // Build comprehensive user context
    const userContext = {
      // User profile data
      userName: user?.name,
      userEmail: user?.email,
      province: user?.province || context.selectedProvince || 'ON',

      // Tax form data
      income: context.taxFormData?.income ? parseFloat(context.taxFormData.income) : null,
      deductions: context.taxFormData?.deductions ? parseFloat(context.taxFormData.deductions) : null,
      filingStatus: context.taxFormData?.filingStatus || null,
      taxYear: context.taxFormData?.taxYear || '2024',

      // App context
      activeTab: context.activeTab || 'Dashboard',
      hasDocuments: (context.documentsCount || 0) > 0,
      documentCount: context.documentsCount || 0,
      uploadedFileTypes: context.uploadedFileTypes || [],

      // Chat history context
      chatHistory: context.chatHistory || [],

      // Additional context
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ...context
    };

    console.log(`📊 Context for user ${userId}:`, {
      province: userContext.province,
      income: userContext.income ? `$${userContext.income.toLocaleString()}` : 'Not provided',
      hasDocuments: userContext.hasDocuments,
      activeTab: userContext.activeTab
    });

    // Generate AI response using enhanced system
    const startTime = Date.now();
    const aiResponse = await enhancedCanadianTaxAI.generateResponse(message, userId, userContext);
    const responseTime = Date.now() - startTime;

    console.log(`✅ AI Response generated in ${responseTime}ms with confidence: ${aiResponse.confidence}%`);

    // Format response for frontend
    const formattedResponse = {
      message: aiResponse.message,
      confidence: aiResponse.confidence,
      sources: aiResponse.sources || ['Canadian Tax AI Assistant'],
      aiInsight: aiResponse.aiInsight !== false,
      suggestedActions: aiResponse.suggestedActions || [],
      responseType: aiResponse.responseType || 'general',
      timestamp: aiResponse.timestamp,
      metadata: {
        userId: userId,
        responseTime: responseTime,
        fromCache: aiResponse.fromCache || false,
        tokensUsed: aiResponse.tokens_used || 0,
        conversationId: aiResponse.conversationId
      }
    };

    // Log successful interaction
    console.log(`💬 Successful AI chat interaction:`, {
      userId,
      messageLength: message.length,
      responseType: aiResponse.responseType,
      confidence: aiResponse.confidence,
      fromCache: aiResponse.fromCache,
      responseTime: `${responseTime}ms`
    });

    res.json({
      success: true,
      data: formattedResponse
    });

  } catch (error) {
    console.error('❌ AI Chat Error:', error);

    // Enhanced error response
    const errorResponse = {
      message: "I apologize, but I'm having trouble processing your request right now. Let me try to help with a general Canadian tax response instead!\n\n🇨🇦 I can assist with:\n• Tax calculations and planning\n• RRSP and TFSA advice\n• Deductions and credits\n• CRA deadlines and requirements\n\nCould you please rephrase your question or ask about a specific Canadian tax topic?",
      confidence: 60,
      sources: ['Canadian Tax AI Assistant'],
      aiInsight: true,
      suggestedActions: [
        'Calculate my taxes',
        'RRSP vs TFSA advice',
        'Find tax deductions',
        'Check tax deadlines'
      ],
      responseType: 'error_fallback',
      timestamp: new Date().toISOString(),
      metadata: {
        error: error.message,
        userId: req.userId
      }
    };

    res.status(200).json({
      success: true,
      data: errorResponse
    });
  }
});

// Additional utility routes for the AI system

// Get conversation history
app.get('/api/ai/history', authenticateToken, (req, res) => {
  try {
    const userId = req.userId;
    const history = enhancedCanadianTaxAI.getConversationHistory(userId);

    res.json({
      success: true,
      data: {
        history: history.slice(-20), // Last 20 messages
        count: history.length
      }
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve chat history'
    });
  }
});

// Clear conversation history
app.delete('/api/ai/history', authenticateToken, (req, res) => {
  try {
    const userId = req.userId;
    const cleared = enhancedCanadianTaxAI.clearConversationHistory(userId);

    res.json({
      success: true,
      data: {
        cleared: cleared,
        message: 'Conversation history cleared successfully'
      }
    });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat history'
    });
  }
});

// Get AI system stats (for monitoring)
app.get('/api/ai/stats', authenticateToken, (req, res) => {
  try {
    const stats = enhancedCanadianTaxAI.getStats();

    res.json({
      success: true,
      data: {
        ...stats,
        serverUptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting AI stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve AI statistics'
    });
  }
});

// Test AI endpoint (for debugging)
app.post('/api/ai/test', authenticateToken, [
  body('message').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.userId;

    const testContext = {
      province: 'ON',
      income: 75000,
      filingStatus: 'single',
      activeTab: 'Test',
      hasDocuments: false,
      documentCount: 0
    };

    const response = await enhancedCanadianTaxAI.generateResponse(message, userId, testContext);

    res.json({
      success: true,
      data: {
        ...response,
        testMode: true,
        contextUsed: testContext
      }
    });
  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({
      success: false,
      message: 'AI test failed',
      error: error.message
    });
  }
});

// Document upload and management routes
app.post('/api/documents/upload', authenticateToken, upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const document = {
      id: generateId(),
      userId: req.userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadDate: new Date(),
      category: req.body.category || 'other'
    };

    documents.push(document);

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: document
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document'
    });
  }
});

app.get('/api/documents', authenticateToken, (req, res) => {
  try {
    const userDocuments = documents.filter(doc => doc.userId === req.userId);

    res.json({
      success: true,
      data: userDocuments
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents'
    });
  }
});

app.delete('/api/documents/:id', authenticateToken, (req, res) => {
  try {
    const documentIndex = documents.findIndex(doc =>
      doc.id === req.params.id && doc.userId === req.userId
    );

    if (documentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = documents[documentIndex];

    // Delete file from filesystem
    const filePath = path.join(uploadsDir, document.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    documents.splice(documentIndex, 1);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
});

// Tax form routes
app.post('/api/tax-forms', authenticateToken, [
  body('income').isNumeric(),
  body('deductions').isNumeric(),
  body('province').isLength({ min: 2, max: 2 }),
  body('filingStatus').isIn(['single', 'married_joint', 'married_separate', 'head_of_household']),
  body('taxYear').isNumeric()
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
    const taxForm = {
      id: generateId(),
      userId: req.userId,
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    taxForms.push(taxForm);

    res.json({
      success: true,
      message: 'Tax form saved successfully',
      data: taxForm
    });
  } catch (error) {
    console.error('Save tax form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save tax form'
    });
  }
});

app.get('/api/tax-forms', authenticateToken, (req, res) => {
  try {
    const userTaxForms = taxForms.filter(form => form.userId === req.userId);

    res.json({
      success: true,
      data: userTaxForms
    });
  } catch (error) {
    console.error('Get tax forms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tax forms'
    });
  }
});

app.get('/api/tax-forms/:id', authenticateToken, (req, res) => {
  try {
    const taxForm = taxForms.find(form =>
      form.id === req.params.id && form.userId === req.userId
    );

    if (!taxForm) {
      return res.status(404).json({
        success: false,
        message: 'Tax form not found'
      });
    }

    res.json({
      success: true,
      data: taxForm
    });
  } catch (error) {
    console.error('Get tax form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tax form'
    });
  }
});

app.put('/api/tax-forms/:id', authenticateToken, [
  body('income').optional().isNumeric(),
  body('deductions').optional().isNumeric(),
  body('province').optional().isLength({ min: 2, max: 2 }),
  body('filingStatus').optional().isIn(['single', 'married_joint', 'married_separate', 'head_of_household']),
  body('taxYear').optional().isNumeric()
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
    const taxFormIndex = taxForms.findIndex(form =>
      form.id === req.params.id && form.userId === req.userId
    );

    if (taxFormIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Tax form not found'
      });
    }

    taxForms[taxFormIndex] = {
      ...taxForms[taxFormIndex],
      ...req.body,
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Tax form updated successfully',
      data: taxForms[taxFormIndex]
    });
  } catch (error) {
    console.error('Update tax form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tax form'
    });
  }
});

app.delete('/api/tax-forms/:id', authenticateToken, (req, res) => {
  try {
    const taxFormIndex = taxForms.findIndex(form =>
      form.id === req.params.id && form.userId === req.userId
    );

    if (taxFormIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Tax form not found'
      });
    }

    taxForms.splice(taxFormIndex, 1);

    res.json({
      success: true,
      message: 'Tax form deleted successfully'
    });
  } catch (error) {
    console.error('Delete tax form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tax form'
    });
  }
});

// User profile routes
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await findUserData({ id: req.userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile'
    });
  }
});

app.put('/api/user/profile', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('province').optional().isLength({ min: 2, max: 2 })
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
    const userIndex = users.findIndex(u => u.id === req.userId);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it's already taken
    if (req.body.email && req.body.email !== users[userIndex].email) {
      const existingUser = await findUserData({ email: req.body.email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    users[userIndex] = {
      ...users[userIndex],
      ...req.body,
      updatedAt: new Date()
    };

    const { password, ...userWithoutPassword } = users[userIndex];

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Dashboard stats route
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const userTaxForms = taxForms.filter(form => form.userId === userId);
    const userDocuments = documents.filter(doc => doc.userId === userId);

    // Get latest tax form for quick stats
    const latestForm = userTaxForms.length > 0 ?
      userTaxForms.reduce((latest, current) =>
        new Date(current.updatedAt) > new Date(latest.updatedAt) ? current : latest
      ) : null;

    let taxCalculation = null;
    if (latestForm) {
      taxCalculation = calculateCanadianTax(
        parseFloat(latestForm.income),
        parseFloat(latestForm.deductions),
        latestForm.filingStatus,
        latestForm.province
      );
    }

    const stats = {
      totalForms: userTaxForms.length,
      totalDocuments: userDocuments.length,
      latestForm: latestForm,
      taxCalculation: taxCalculation,
      documentsSize: userDocuments.reduce((total, doc) => total + doc.size, 0),
      lastActivity: userTaxForms.length > 0 || userDocuments.length > 0 ?
        Math.max(
          ...userTaxForms.map(f => new Date(f.updatedAt).getTime()),
          ...userDocuments.map(d => new Date(d.uploadDate).getTime())
        ) : null
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard stats'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.'
      });
    }
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🍁 Canadian Tax Prep AI Backend Server is running on port ${PORT}!`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🏛️ Tax System: Canada Revenue Agency (CRA) 2024`);
  console.log(`🤖 AI Features: Enhanced Canadian Tax Intelligence`);
  console.log(`💾 Storage: In-memory (development mode)`);
  console.log(`🔐 Security: JWT Authentication, Rate Limiting, Helmet`);
  console.log('\n✅ Ready to accept Canadian tax calculations!\n');
});

module.exports = app;