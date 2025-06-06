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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log('🔧 Initializing Tax Prep AI Backend...');

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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

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
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
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

// In-memory storage (replace with actual database)
const users = [];
const taxForms = [];
const documents = [];
const chatHistory = [];

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

// Middleware for JWT authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.userId = decoded.userId;
    next();
  });
};

// Tax calculation function
const calculateTax = (income, deductions, filingStatus) => {
  const taxableIncome = Math.max(0, income - deductions);
  let tax = 0;
  let standardDeduction = 12950; // 2024 standard deduction for single

  // Adjust standard deduction based on filing status
  switch (filingStatus) {
    case 'married_joint':
      standardDeduction = 25900;
      break;
    case 'married_separate':
      standardDeduction = 12950;
      break;
    case 'head_of_household':
      standardDeduction = 19400;
      break;
    default:
      standardDeduction = 12950;
  }

  const adjustedTaxableIncome = Math.max(0, taxableIncome - standardDeduction);

  // Simplified tax brackets for 2024 (single filer)
  if (adjustedTaxableIncome <= 11000) {
    tax = adjustedTaxableIncome * 0.10;
  } else if (adjustedTaxableIncome <= 44725) {
    tax = 1100 + (adjustedTaxableIncome - 11000) * 0.12;
  } else if (adjustedTaxableIncome <= 95375) {
    tax = 5147 + (adjustedTaxableIncome - 44725) * 0.22;
  } else if (adjustedTaxableIncome <= 182050) {
    tax = 16290 + (adjustedTaxableIncome - 95375) * 0.24;
  } else if (adjustedTaxableIncome <= 231250) {
    tax = 37104 + (adjustedTaxableIncome - 182050) * 0.32;
  } else if (adjustedTaxableIncome <= 578125) {
    tax = 52832 + (adjustedTaxableIncome - 231250) * 0.35;
  } else {
    tax = 174238.25 + (adjustedTaxableIncome - 578125) * 0.37;
  }

  const effectiveRate = taxableIncome > 0 ? (tax / taxableIncome) * 100 : 0;
  
  // Estimate withholdings (simplified)
  const estimatedWithholdings = income * 0.15;
  const refund = Math.max(0, estimatedWithholdings - tax);

  return {
    tax: Math.round(tax),
    refund: Math.round(refund),
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    taxableIncome: Math.round(adjustedTaxableIncome)
  };
};

// AI Chat simulation function
const generateAIResponse = (message) => {
  const responses = {
    greeting: [
      "Hello! I'm here to help with your tax questions. What would you like to know?",
      "Hi there! How can I assist you with your taxes today?",
      "Welcome! I'm your AI tax assistant. What can I help you with?"
    ],
    deductions: [
      "Common deductions include mortgage interest, charitable donations, state and local taxes, and business expenses. Make sure to keep receipts!",
      "You can deduct medical expenses that exceed 7.5% of your adjusted gross income, along with mortgage interest and charitable contributions.",
      "Don't forget about the standard deduction! For 2024, it's $12,950 for single filers and $25,900 for married filing jointly."
    ],
    forms: [
      "Most people need Form 1040. You might also need Schedule A for itemized deductions or Schedule C for business income.",
      "Form W-2 from your employer and Form 1099s for other income are essential. Don't forget Form 1098 for mortgage interest!",
      "The main form is 1040, but you may need additional schedules depending on your situation."
    ],
    deadline: [
      "The tax deadline for 2024 returns is April 15, 2025. You can request an extension until October 15, but you still need to pay any owed taxes by April 15.",
      "Don't miss the April 15th deadline! If you need more time, file for an extension, but remember that's just for filing, not paying.",
      "Tax day is April 15th. Mark your calendar and gather your documents early!"
    ],
    calculator: [
      "I can help you estimate your taxes! Enter your income, deductions, and filing status in the calculator section.",
      "The tax calculator uses current tax brackets to estimate your liability. Remember, this is just an estimate - consult a professional for detailed advice.",
      "Use the calculator to get a rough idea of your taxes. Don't forget to include all sources of income!"
    ],
    documents: [
      "Important documents include W-2s, 1099s, receipts for deductions, and previous year's tax return. Keep everything organized!",
      "Upload your tax documents to keep them organized. Common ones are W-2, 1099-INT, 1098 for mortgage interest, and charitable donation receipts.",
      "Make sure to gather all your tax documents before filing. Missing documents can delay your refund or cause errors."
    ],
    default: [
      "That's a great tax question! For specific advice, I recommend consulting with a tax professional or checking the IRS website.",
      "I can help with general tax information. For your specific situation, consider speaking with a qualified tax advisor.",
      "Let me help you with that tax question. What specific area would you like to know more about - deductions, forms, or calculations?"
    ]
  };

  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return responses.greeting[Math.floor(Math.random() * responses.greeting.length)];
  } else if (lowerMessage.includes('deduction') || lowerMessage.includes('deduct')) {
    return responses.deductions[Math.floor(Math.random() * responses.deductions.length)];
  } else if (lowerMessage.includes('form') || lowerMessage.includes('1040') || lowerMessage.includes('w-2')) {
    return responses.forms[Math.floor(Math.random() * responses.forms.length)];
  } else if (lowerMessage.includes('deadline') || lowerMessage.includes('april') || lowerMessage.includes('when')) {
    return responses.deadline[Math.floor(Math.random() * responses.deadline.length)];
  } else if (lowerMessage.includes('calculate') || lowerMessage.includes('calculator') || lowerMessage.includes('tax') && lowerMessage.includes('estimate')) {
    return responses.calculator[Math.floor(Math.random() * responses.calculator.length)];
  } else if (lowerMessage.includes('document') || lowerMessage.includes('upload') || lowerMessage.includes('file')) {
    return responses.documents[Math.floor(Math.random() * responses.documents.length)];
  } else {
    return responses.default[Math.floor(Math.random() * responses.default.length)];
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json({ 
    status: 'OK', 
    message: 'Tax Prep AI API is running', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Authentication routes
app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 1 })
], async (req, res) => {
  console.log('📝 Registration attempt:', req.body.email);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({ 
      success: false, 
      message: 'Validation errors', 
      errors: errors.array() 
    });
  }

  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    console.log('❌ User already exists:', email);
    return res.status(400).json({ 
      success: false, 
      message: 'User already exists with this email' 
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: generateId(),
      name,
      email,
      password: hashedPassword,
      createdAt: new Date()
    };

    users.push(newUser);
    console.log('✅ User registered successfully:', email);

    const token = generateToken(newUser.id);
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating user' 
    });
  }
});

app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  console.log('🔐 Login attempt:', req.body.email);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({ 
      success: false, 
      message: 'Validation errors', 
      errors: errors.array() 
    });
  }

  const { email, password } = req.body;

  try {
    const user = users.find(u => u.email === email);
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    console.log('✅ Login successful:', email);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during login' 
    });
  }
});

// User profile routes
app.get('/api/user/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'User not found' 
    });
  }

  const { password, ...userWithoutPassword } = user;
  res.json({ success: true, data: userWithoutPassword });
});

app.put('/api/user/profile', authenticateToken, [
  body('email').optional().isEmail().normalizeEmail(),
  body('name').optional().trim().isLength({ min: 1 }),
  body('phone').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation errors', 
      errors: errors.array() 
    });
  }

  const userIndex = users.findIndex(u => u.id === req.userId);
  if (userIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      message: 'User not found' 
    });
  }

  // Update user data
  users[userIndex] = { ...users[userIndex], ...req.body };
  const { password, ...userWithoutPassword } = users[userIndex];

  console.log('✅ Profile updated for user:', req.userId);
  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: userWithoutPassword
  });
});

// Tax forms routes
app.get('/api/tax-forms', authenticateToken, (req, res) => {
  const userTaxForms = taxForms.filter(form => form.userId === req.userId);
  res.json({ success: true, data: userTaxForms });
});

app.post('/api/tax-forms', authenticateToken, [
  body('income').isNumeric(),
  body('deductions').isNumeric(),
  body('filingStatus').isIn(['single', 'married_joint', 'married_separate', 'head_of_household']),
  body('taxYear').isLength({ min: 4, max: 4 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation errors', 
      errors: errors.array() 
    });
  }

  const { income, deductions, filingStatus, taxYear } = req.body;

  const newTaxForm = {
    id: generateId(),
    userId: req.userId,
    income: parseFloat(income),
    deductions: parseFloat(deductions),
    filingStatus,
    taxYear,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  taxForms.push(newTaxForm);
  console.log('✅ Tax form saved for user:', req.userId);

  res.status(201).json({
    success: true,
    message: 'Tax form saved successfully',
    data: newTaxForm
  });
});

// Tax calculator route
app.post('/api/tax/calculate', authenticateToken, [
  body('income').isNumeric(),
  body('deductions').isNumeric(),
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

  const { income, deductions, filingStatus } = req.body;
  const calculation = calculateTax(
    parseFloat(income), 
    parseFloat(deductions), 
    filingStatus
  );

  console.log('🧮 Tax calculated for user:', req.userId, calculation);
  res.json({
    success: true,
    data: calculation
  });
});

// Document upload routes
app.post('/api/documents/upload', authenticateToken, upload.single('document'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      message: 'No file uploaded' 
    });
  }

  const newDocument = {
    id: generateId(),
    userId: req.userId,
    filename: req.file.filename,
    originalName: req.file.originalname,
    filePath: req.file.path,
    fileType: req.file.mimetype,
    size: req.file.size,
    uploadDate: new Date()
  };

  documents.push(newDocument);
  console.log('📄 Document uploaded for user:', req.userId, req.file.originalname);

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: {
      id: newDocument.id,
      name: newDocument.originalName,
      uploadDate: newDocument.uploadDate.toISOString(),
      fileType: newDocument.fileType,
      size: newDocument.size
    }
  });
});

app.get('/api/documents', authenticateToken, (req, res) => {
  const userDocuments = documents
    .filter(doc => doc.userId === req.userId)
    .map(doc => ({
      id: doc.id,
      name: doc.originalName,
      uploadDate: doc.uploadDate.toISOString(),
      fileType: doc.fileType,
      size: doc.size
    }));

  res.json({ success: true, data: userDocuments });
});

// AI Chat route
app.post('/api/ai/chat', authenticateToken, [
  body('message').trim().isLength({ min: 1 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation errors', 
      errors: errors.array() 
    });
  }

  const { message } = req.body;
  const response = generateAIResponse(message);

  // Save chat history
  const chatMessage = {
    id: generateId(),
    userId: req.userId,
    message,
    response,
    timestamp: new Date()
  };

  chatHistory.push(chatMessage);
  console.log('💬 AI chat for user:', req.userId, message.substring(0, 50) + '...');

  res.json({
    success: true,
    data: { message: response }
  });
});

// Get chat history
app.get('/api/ai/chat/history', authenticateToken, (req, res) => {
  const userChatHistory = chatHistory
    .filter(chat => chat.userId === req.userId)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map(chat => ({
      id: chat.id,
      message: chat.message,
      response: chat.response,
      timestamp: chat.timestamp.toISOString()
    }));

  res.json({ success: true, data: userChatHistory });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  res.status(500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❓ Route not found:', req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Tax Prep AI Backend Server is running!');
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎯 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log('\n✅ Ready to accept connections!\n');
});

module.exports = app;