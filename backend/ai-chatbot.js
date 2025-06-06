const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const CANADIAN_TAX_CONTEXT = `
You are a Canadian Tax AI Assistant specialized in CRA (Canada Revenue Agency) regulations for 2024.
You have expertise in Canadian federal and provincial tax law, RRSP/TFSA planning, and CRA compliance.

KEY CANADIAN TAX INFORMATION FOR 2024:
- Federal Basic Personal Amount: $15,705
- RRSP Contribution Limit: 18% of income or $31,560 (whichever is less)
- TFSA Annual Limit: $7,000
- CPP Maximum Pensionable Earnings: $68,500
- CPP Rate: 5.95% (employee portion)
- EI Maximum Insurable Earnings: $65,700
- EI Rate: 2.29% (employee portion)

FEDERAL TAX BRACKETS 2024:
- 15% on income up to $55,867
- 20.5% on income from $55,867 to $111,733
- 26% on income from $111,733 to $173,205  
- 29% on income from $173,205 to $246,752
- 33% on income over $246,752

PROVINCIAL BASIC PERSONAL AMOUNTS:
- Ontario: $11,865
- British Columbia: $11,980
- Alberta: $21,003
- Quebec: $18,056
- Manitoba: $15,000
- Saskatchewan: $17,661

IMPORTANT DEADLINES:
- Tax Filing Deadline: April 30, 2025
- RRSP Contribution Deadline: March 1, 2025
- Self-employed filing: June 15, 2025 (but payment due April 30)

COMMON DEDUCTIONS & CREDITS:
- Medical expenses over 3% of income or $2,635
- Charitable donations (up to 75% of income)
- Child care expenses
- Moving expenses (for work/study)
- Union dues and professional fees
- Home office expenses (flat rate $2/day or detailed method)

Always provide accurate, helpful advice specific to Canadian tax law and CRA requirements.
Be conversational, supportive, and include specific dollar amounts when possible.
`;

// Enhanced AI Response Generator
class EnhancedCanadianTaxAI {
  constructor() {
    this.conversationHistory = new Map();
    this.userProfiles = new Map();
    this.responseCache = new Map();
  }

  // Main chat function with improved error handling
  async generateResponse(message, userId, userContext = {}) {
    try {
      console.log(`🤖 Processing AI request for user ${userId}: "${message.substring(0, 50)}..."`);
      
      // Get or create conversation history
      let history = this.conversationHistory.get(userId) || [];
      
      // Update user profile with context
      this.updateUserProfile(userId, userContext);
      const profile = this.userProfiles.get(userId) || {};

      // Check cache first for common questions
      const cacheKey = this.generateCacheKey(message, profile);
      const cachedResponse = this.responseCache.get(cacheKey);
      if (cachedResponse) {
        console.log(`📋 Returning cached response for: ${message.substring(0, 30)}...`);
        return { ...cachedResponse, fromCache: true };
      }

      // Try OpenAI first, fallback to enhanced rule-based
      let response;
      if (openai && process.env.OPENAI_API_KEY) {
        try {
          console.log(`🧠 Using OpenAI for response generation`);
          response = await this.getOpenAIResponse(message, history, profile);
        } catch (error) {
          console.log(`⚠️ OpenAI fallback to rule-based:`, error.message);
          response = this.getEnhancedRuleBasedResponse(message, profile);
        }
      } else {
        console.log(`🔧 Using enhanced rule-based response system`);
        response = this.getEnhancedRuleBasedResponse(message, profile);
      }

      // Add to conversation history
      history.push(
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: response.message, timestamp: new Date() }
      );
      
      // Keep only last 10 exchanges (20 messages)
      if (history.length > 20) {
        history = history.slice(-20);
      }
      
      this.conversationHistory.set(userId, history);

      // Cache the response for similar future questions
      this.responseCache.set(cacheKey, response);
      
      // Limit cache size
      if (this.responseCache.size > 100) {
        const firstKey = this.responseCache.keys().next().value;
        this.responseCache.delete(firstKey);
      }

      console.log(`✅ Generated response with confidence: ${response.confidence}%`);

      return {
        ...response,
        conversationId: userId,
        timestamp: new Date().toISOString(),
        fromCache: false
      };

    } catch (error) {
      console.error('❌ AI Chat Error:', error);
      return this.getFallbackResponse(message);
    }
  }

  // Improved OpenAI Integration
  async getOpenAIResponse(message, history, profile) {
    try {
      const systemPrompt = this.buildEnhancedSystemPrompt(profile);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 600,
        temperature: 0.3, // Lower temperature for more consistent responses
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const responseText = completion.choices[0].message.content;
      
      return {
        message: responseText,
        confidence: 95,
        sources: ['OpenAI GPT-4 + Canadian Tax Database'],
        aiInsight: true,
        suggestedActions: this.extractSuggestedActions(responseText, profile),
        responseType: 'ai_powered',
        tokens_used: completion.usage?.total_tokens || 0
      };

    } catch (error) {
      console.error('❌ OpenAI Error:', error);
      throw error;
    }
  }

  // Much improved rule-based system
  getEnhancedRuleBasedResponse(message, profile) {
    const lowerMessage = message.toLowerCase();
    const income = parseFloat(profile.income) || 0;
    const province = profile.province || 'ON';
    const userName = profile.userName || '';

    // Greeting responses
    if (this.isGreeting(lowerMessage)) {
      const incomeContext = income > 0 ? ` I see you have an income of $${income.toLocaleString()}.` : '';
      return {
        message: `Hello${userName ? ' ' + userName : ''}! 🍁 I'm your Canadian Tax AI Assistant specializing in CRA regulations and ${this.getProvinceName(province)} tax law.${incomeContext} I can help you with tax calculations, RRSP planning, deductions, and CRA compliance. What tax question can I help you with today?`,
        confidence: 95,
        sources: ['Canadian CRA Tax Expert'],
        aiInsight: true,
        suggestedActions: ['Calculate my taxes', 'RRSP vs TFSA advice', 'Find tax deductions', 'Upload tax documents'],
        responseType: 'greeting'
      };
    }

    // RRSP specific advice with calculations
    if (lowerMessage.includes('rrsp')) {
      const rrspRoom = income > 0 ? Math.min(income * 0.18, 31560) : 31560;
      const taxSavings = income > 0 ? rrspRoom * (this.getMarginalTaxRate(income) / 100) : 0;
      
      let message = `**RRSP Planning for 2024:**\n\n`;
      message += `• Maximum contribution: 18% of income or $31,560 (whichever is less)\n`;
      message += `• Contribution deadline: March 1, 2025\n\n`;
      
      if (income > 0) {
        message += `**Your RRSP Analysis:**\n`;
        message += `• Maximum contribution room: $${rrspRoom.toLocaleString()}\n`;
        message += `• Estimated tax savings: $${Math.round(taxSavings).toLocaleString()}\n`;
        message += `• Your marginal tax rate: ${this.getMarginalTaxRate(income)}%\n\n`;
        message += `💡 **Tip:** Contributing to your RRSP reduces your taxable income dollar-for-dollar!`;
      } else {
        message += `To calculate your specific RRSP room and tax savings, I'll need your annual income.`;
      }
      
      return {
        message,
        confidence: 94,
        sources: ['CRA RRSP Guidelines 2024'],
        aiInsight: true,
        suggestedActions: ['Calculate exact RRSP room', 'Compare RRSP vs TFSA', 'Set up automatic contributions', 'Learn about spousal RRSPs'],
        responseType: 'rrsp_advice'
      };
    }

    // TFSA advice
    if (lowerMessage.includes('tfsa')) {
      let message = `**TFSA (Tax-Free Savings Account) for 2024:**\n\n`;
      message += `• Annual contribution limit: $7,000\n`;
      message += `• Lifetime contribution room: $95,000 (if 18+ since 2009)\n`;
      message += `• Withdrawals are tax-free and don't affect benefits\n`;
      message += `• No tax deduction for contributions\n\n`;
      message += `**TFSA vs RRSP:**\n`;
      message += `• TFSA: Better for emergency funds, short-term goals, or if you expect higher income in retirement\n`;
      message += `• RRSP: Better for tax deduction now if you're in a higher tax bracket\n\n`;
      message += `💡 **Tip:** If you withdraw from TFSA, you can re-contribute that amount in the following year!`;
      
      return {
        message,
        confidence: 93,
        sources: ['CRA TFSA Guidelines 2024'],
        aiInsight: true,
        suggestedActions: ['Check TFSA contribution room', 'Compare investment options', 'Learn about TFSA withdrawals', 'TFSA vs RRSP calculator'],
        responseType: 'tfsa_advice'
      };
    }

    // Tax calculation requests
    if (lowerMessage.includes('calculate') || (lowerMessage.includes('tax') && (lowerMessage.includes('owe') || lowerMessage.includes('pay')))) {
      if (income > 0) {
        const federalTax = this.calculateFederalTax(income);
        const provincialTax = this.calculateProvincialTax(income, province);
        const cppEi = this.calculateCppEi(income);
        const totalTax = federalTax + provincialTax + cppEi.cpp + cppEi.ei;
        const marginalRate = this.getMarginalTaxRate(income);
        const netIncome = income - totalTax;
        
        let message = `**Tax Calculation for ${this.getProvinceName(province)}:**\n\n`;
        message += `💰 **Income:** $${income.toLocaleString()}\n`;
        message += `📊 **Tax Breakdown:**\n`;
        message += `• Federal tax: $${Math.round(federalTax).toLocaleString()}\n`;
        message += `• Provincial tax: $${Math.round(provincialTax).toLocaleString()}\n`;
        message += `• CPP contribution: $${Math.round(cppEi.cpp).toLocaleString()}\n`;
        message += `• EI premium: $${Math.round(cppEi.ei).toLocaleString()}\n\n`;
        message += `🎯 **Total Tax & Contributions:** $${Math.round(totalTax).toLocaleString()}\n`;
        message += `💵 **Net Income:** $${Math.round(netIncome).toLocaleString()}\n`;
        message += `📈 **Marginal Tax Rate:** ${marginalRate}%\n\n`;
        message += `*This is an estimate. Use our detailed tax calculator for precise calculations including deductions and credits.*`;
        
        return {
          message,
          confidence: 90,
          sources: ['CRA Tax Tables 2024', `${this.getProvinceName(province)} Tax Guide`],
          aiInsight: true,
          suggestedActions: ['Use detailed tax calculator', 'Explore tax optimization', 'Review available deductions', 'Compare provinces'],
          responseType: 'tax_calculation'
        };
      } else {
        return {
          message: `I'd be happy to calculate your Canadian taxes! 🇨🇦\n\nTo provide an accurate estimate, I'll need your annual income. I can then calculate:\n• Federal and provincial taxes for ${this.getProvinceName(province)}\n• CPP and EI contributions\n• Your effective and marginal tax rates\n• Net take-home pay\n\nWhat's your annual income? You can also use our tax calculator tool for detailed calculations with deductions and credits.`,
          confidence: 87,
          sources: ['Canadian Tax Calculator'],
          aiInsight: true,
          suggestedActions: ['Use tax calculator', 'Enter income for estimate', 'Upload T4 slips', 'Compare tax provinces'],
          responseType: 'tax_calculation_prompt'
        };
      }
    }

    // Deadline questions
    if (lowerMessage.includes('deadline') || (lowerMessage.includes('when') && (lowerMessage.includes('file') || lowerMessage.includes('due')))) {
      let message = `**Important Canadian Tax Deadlines for 2025:** 📅\n\n`;
      message += `🗓️ **Tax Filing Deadlines:**\n`;
      message += `• Most people: April 30, 2025\n`;
      message += `• Self-employed: June 15, 2025 (but payment still due April 30)\n\n`;
      message += `💰 **Payment Deadlines:**\n`;
      message += `• Balance owing: April 30, 2025\n`;
      message += `• Quarterly installments: March 15, June 15, September 15, December 15\n\n`;
      message += `🏦 **RRSP Deadline:**\n`;
      message += `• 2024 RRSP contributions: March 1, 2025\n\n`;
      message += `⚡ **Pro Tip:** File electronically (NETFILE) to get your refund within 2 weeks instead of 6-8 weeks for paper filing!`;
      
      return {
        message,
        confidence: 98,
        sources: ['CRA Filing Deadlines 2025'],
        aiInsight: true,
        suggestedActions: ['File return early', 'Make RRSP contribution', 'Set up direct deposit', 'Organize tax documents'],
        responseType: 'deadlines'
      };
    }

    // Document questions
    if (lowerMessage.includes('document') || lowerMessage.includes('t4') || lowerMessage.includes('t5') || lowerMessage.includes('slip')) {
      let message = `**Essential Canadian Tax Documents:** 📄\n\n`;
      message += `📋 **Income Slips (by March 31):**\n`;
      message += `• T4: Employment income\n`;
      message += `• T5: Investment income (interest, dividends)\n`;
      message += `• T4A: Pension, retirement, scholarship income\n`;
      message += `• T3: Trust income\n`;
      message += `• T5008: Securities transactions\n\n`;
      message += `🧾 **Deduction Receipts:**\n`;
      message += `• RRSP contribution receipts\n`;
      message += `• Medical expense receipts\n`;
      message += `• Charitable donation receipts\n`;
      message += `• Childcare expense receipts\n`;
      message += `• Moving expense receipts\n\n`;
      message += `🏠 **Other Important Documents:**\n`;
      message += `• T2202: Tuition fees\n`;
      message += `• Home office expense records\n`;
      message += `• Professional dues receipts\n\n`;
      message += `💡 **Tip:** Upload these documents to our system for automatic data extraction and optimization suggestions!`;
      
      return {
        message,
        confidence: 92,
        sources: ['CRA Document Requirements 2024'],
        aiInsight: true,
        suggestedActions: ['Upload T4 slips', 'Upload T5 slips', 'Organize receipts', 'Check missing documents'],
        responseType: 'documents'
      };
    }

    // Home office questions
    if (lowerMessage.includes('home office') || lowerMessage.includes('work from home') || lowerMessage.includes('office expense')) {
      let message = `**Home Office Expense Deduction Options (2024):** 🏠\n\n`;
      message += `📊 **Method 1: Temporary Flat Rate**\n`;
      message += `• $2 per day worked from home\n`;
      message += `• Maximum $500 per person\n`;
      message += `• No receipts required\n`;
      message += `• Cannot claim other employment expenses\n\n`;
      message += `📊 **Method 2: Detailed Method**\n`;
      message += `• Calculate percentage of home used for work\n`;
      message += `• Claim portion of: utilities, rent/mortgage interest, maintenance\n`;
      message += `• Requires Form T2200 from employer\n`;
      message += `• Keep detailed records and receipts\n\n`;
      message += `✅ **Eligibility Requirements:**\n`;
      message += `• Work from home due to COVID-19, OR\n`;
      message += `• Employer requires you to work from home\n`;
      message += `• Work from home more than 50% of the time\n\n`;
      message += `💡 **Recommendation:** Use the flat rate method if you worked from home less than 250 days, otherwise consider the detailed method.`;
      
      return {
        message,
        confidence: 94,
        sources: ['CRA Home Office Guidelines 2024'],
        aiInsight: true,
        suggestedActions: ['Calculate flat rate benefit', 'Compare both methods', 'Get T2200 from employer', 'Track home office expenses'],
        responseType: 'home_office'
      };
    }

    // Province-specific questions
    if (lowerMessage.includes('province') || lowerMessage.includes('ontario') || lowerMessage.includes('bc') || lowerMessage.includes('alberta') || lowerMessage.includes('quebec')) {
      const provinceInfo = this.getProvinceInfo(province);
      let message = `**${provinceInfo.name} Tax Information (2024):** 🍁\n\n`;
      message += `📊 **Provincial Tax Details:**\n`;
      message += `• Basic Personal Amount: $${provinceInfo.basicPersonal.toLocaleString()}\n`;
      message += `• Sales Tax: ${this.getSalesTaxInfo(province)}\n`;
      message += `• Provincial tax rates: ${this.getProvincialTaxRates(province)}\n\n`;
      message += `🎯 **Key Provincial Credits:**\n`;
      message += `${this.getProvincialCredits(province)}\n\n`;
      message += `💡 **Did you know?** Each province has different tax rates and credits. Moving to a different province can significantly impact your tax situation!`;
      
      return {
        message,
        confidence: 89,
        sources: [`${provinceInfo.name} Provincial Tax Guide 2024`],
        aiInsight: true,
        suggestedActions: ['Compare provincial taxes', 'View tax calculator', 'Check provincial credits', 'Learn about HST/PST'],
        responseType: 'provincial_info'
      };
    }

    // Deduction questions
    if (lowerMessage.includes('deduction') || lowerMessage.includes('claim') || lowerMessage.includes('credit')) {
      let message = `**Common Canadian Tax Deductions & Credits:** 💰\n\n`;
      message += `🏥 **Medical Expenses:**\n`;
      message += `• Amount over 3% of income or $2,635 (whichever is less)\n`;
      message += `• Includes prescriptions, dental, vision care\n\n`;
      message += `❤️ **Charitable Donations:**\n`;
      message += `• 15% federal credit on first $200\n`;
      message += `• 29% federal credit on amounts over $200\n`;
      message += `• Plus provincial credits\n\n`;
      message += `👶 **Child-Related:**\n`;
      message += `• Canada Child Benefit (tax-free)\n`;
      message += `• Child care expenses\n`;
      message += `• Children's fitness and arts credits (some provinces)\n\n`;
      message += `🎓 **Education:**\n`;
      message += `• Tuition fees (T2202)\n`;
      message += `• Student loan interest\n`;
      message += `• Textbook amounts (some provinces)\n\n`;
      
      if (income > 0) {
        const marginalRate = this.getMarginalTaxRate(income);
        message += `💡 **Your Tax Savings:** At your ${marginalRate}% marginal rate, every $1,000 deduction saves you approximately $${Math.round(marginalRate * 10)} in taxes!`;
      } else {
        message += `💡 **Tip:** Higher income earners benefit more from deductions due to higher marginal tax rates!`;
      }
      
      return {
        message,
        confidence: 90,
        sources: ['CRA Deductions and Credits Guide 2024'],
        aiInsight: true,
        suggestedActions: ['Upload receipts', 'Calculate medical expenses', 'Track charitable donations', 'Review all available credits'],
        responseType: 'deductions'
      };
    }

    // Investment/capital gains questions
    if (lowerMessage.includes('capital gain') || lowerMessage.includes('investment') || lowerMessage.includes('dividend') || lowerMessage.includes('stock')) {
      let message = `**Investment Taxation in Canada:** 📈\n\n`;
      message += `💼 **Capital Gains:**\n`;
      message += `• 50% of capital gains are taxable\n`;
      message += `• Taxed at your marginal rate\n`;
      message += `• Principal residence exemption available\n\n`;
      message += `💰 **Dividends:**\n`;
      message += `• Canadian eligible dividends: Gross up by 38%, then dividend tax credit\n`;
      message += `• Generally tax-efficient for higher income earners\n\n`;
      message += `🏦 **Interest Income:**\n`;
      message += `• Fully taxable at marginal rate\n`;
      message += `• Consider holding in RRSP/TFSA\n\n`;
      message += `🎯 **Tax-Loss Harvesting:**\n`;
      message += `• Offset gains with losses\n`;
      message += `• Beware of superficial loss rules (30-day rule)\n\n`;
      message += `💡 **Strategy:** Hold growth investments in TFSA, dividend-paying stocks in non-registered accounts, and interest-bearing investments in RRSP!`;
      
      return {
        message,
        confidence: 88,
        sources: ['CRA Investment Income Guide 2024'],
        aiInsight: true,
        suggestedActions: ['Learn about tax-loss harvesting', 'Optimize investment accounts', 'Track adjusted cost base', 'Review T5008 slips'],
        responseType: 'investment_taxation'
      };
    }

    // Self-employment questions
    if (lowerMessage.includes('self employ') || lowerMessage.includes('business') || lowerMessage.includes('freelance') || lowerMessage.includes('contractor')) {
      let message = `**Self-Employment Tax Guide:** 💼\n\n`;
      message += `📊 **Business Income (T2125):**\n`;
      message += `• Report all business income\n`;
      message += `• Deduct legitimate business expenses\n`;
      message += `• Keep detailed records and receipts\n\n`;
      message += `💰 **Common Business Deductions:**\n`;
      message += `• Home office expenses\n`;
      message += `• Vehicle expenses (business portion)\n`;
      message += `• Professional development\n`;
      message += `• Equipment and supplies\n`;
      message += `• Professional fees and memberships\n\n`;
      message += `📅 **Important Deadlines:**\n`;
      message += `• Filing deadline: June 15, 2025\n`;
      message += `• Payment deadline: April 30, 2025\n`;
      message += `• Quarterly installments may be required\n\n`;
      message += `🔄 **CPP Contributions:**\n`;
      message += `• Pay both employer and employee portions (11.9% total)\n`;
      message += `• Maximum $7,254 for 2024\n\n`;
      message += `💡 **Tip:** Consider incorporating if business income is over $50,000 for potential tax advantages!`;
      
      return {
        message,
        confidence: 91,
        sources: ['CRA Self-Employment Guide 2024'],
        aiInsight: true,
        suggestedActions: ['Track business expenses', 'Learn about incorporation', 'Set up quarterly payments', 'Organize business records'],
        responseType: 'self_employment'
      };
    }

    // Default response - much more helpful
    return {
      message: `I'm here to help with your Canadian tax questions! 🇨🇦 As your CRA specialist, I can assist with:\n\n📊 **Tax Calculations & Planning:**\n• Federal and provincial tax estimates\n• RRSP vs TFSA optimization\n• Tax-efficient investment strategies\n\n🧾 **Deductions & Credits:**\n• Medical expenses, charitable donations\n• Home office expenses\n• Child care and education credits\n\n📋 **CRA Compliance:**\n• Required documents and deadlines\n• Filing requirements and procedures\n• Audit preparation and record-keeping\n\n${profile.province ? `I see you're in ${this.getProvinceName(profile.province)}.` : ''} What specific Canadian tax topic would you like to explore today?`,
      confidence: 85,
      sources: ['Canadian CRA Tax Expert'],
      aiInsight: true,
      suggestedActions: ['Calculate my taxes', 'RRSP planning advice', 'Find tax deductions', 'Learn about deadlines', 'Compare provinces'],
      responseType: 'general_help'
    };
  }

  // Enhanced helper functions
  generateCacheKey(message, profile) {
    const key = message.toLowerCase().replace(/[^a-z0-9\s]/g, '').substring(0, 50);
    const profileKey = `${profile.province || 'ON'}_${profile.income ? 'income' : 'noincome'}`;
    return `${key}_${profileKey}`;
  }

  buildEnhancedSystemPrompt(profile) {
    let prompt = CANADIAN_TAX_CONTEXT;
    
    if (profile.income) {
      const income = parseFloat(profile.income);
      prompt += `\n\nUSER PROFILE:`;
      prompt += `\n- Annual Income: $${income.toLocaleString()}`;
      prompt += `\n- Federal Tax Bracket: ${this.getMarginalTaxRate(income)}%`;
      prompt += `\n- RRSP Room: $${Math.min(income * 0.18, 31560).toLocaleString()}`;
    }
    
    if (profile.province) {
      const provinceInfo = this.getProvinceInfo(profile.province);
      prompt += `\n- Province: ${provinceInfo.name}`;
      prompt += `\n- Provincial Basic Personal Amount: $${provinceInfo.basicPersonal.toLocaleString()}`;
    }
    
    if (profile.filingStatus) {
      prompt += `\n- Filing Status: ${profile.filingStatus}`;
    }
    
    if (profile.hasDocuments) {
      prompt += `\n- Documents Uploaded: ${profile.documentCount} documents`;
    }

    prompt += `\n\nRESPONSE GUIDELINES:
- Be conversational, helpful, and encouraging
- Provide specific Canadian tax advice with dollar amounts when possible
- Always mention relevant CRA forms and deadlines
- Use Canadian terminology (RRSP, TFSA, CPP, EI, HST, etc.)
- Include concrete next steps and actionable advice
- Format responses with headers and bullet points for readability
- If calculations are involved, show the math
- Always clarify that these are estimates and recommend professional advice for complex situations
- Keep responses comprehensive but under 400 words
- Use emojis sparingly but effectively for visual appeal`;

    return prompt;
  }

  // Tax calculation helper functions
  getMarginalTaxRate(income) {
    if (income <= 55867) return 15;
    if (income <= 111733) return 20.5;
    if (income <= 173205) return 26;
    if (income <= 246752) return 29;
    return 33;
  }

  calculateFederalTax(income) {
    const taxableIncome = Math.max(0, income - 15705); // Basic personal amount
    
    if (taxableIncome <= 55867) return taxableIncome * 0.15;
    if (taxableIncome <= 111733) return 8380 + (taxableIncome - 55867) * 0.205;
    if (taxableIncome <= 173205) return 19822 + (taxableIncome - 111733) * 0.26;
    if (taxableIncome <= 246752) return 35814 + (taxableIncome - 173205) * 0.29;
    return 57168 + (taxableIncome - 246752) * 0.33;
  }

  calculateProvincialTax(income, province) {
    const provinceInfo = this.getProvinceInfo(province);
    const taxableIncome = Math.max(0, income - provinceInfo.basicPersonal);
    
    // Simplified provincial tax calculation
    const rates = {
      'ON': 0.0505, 'BC': 0.0506, 'AB': 0.10, 'SK': 0.105,
      'MB': 0.1075, 'QC': 0.14, 'NB': 0.095, 'NS': 0.0879,
      'PE': 0.098, 'NL': 0.087, 'YT': 0.064, 'NT': 0.059, 'NU': 0.04
    };
    
    return taxableIncome * (rates[province] || rates['ON']);
  }

  calculateCppEi(income) {
    const cppContribution = Math.min(Math.max(0, income - 3500) * 0.0595, 4055);
    const eiContribution = Math.min(income * 0.0229, 1505);
    return { cpp: cppContribution, ei: eiContribution };
  }

  getProvinceInfo(province) {
    const provinceData = {
      'ON': { name: 'Ontario', basicPersonal: 11865 },
      'BC': { name: 'British Columbia', basicPersonal: 11980 },
      'AB': { name: 'Alberta', basicPersonal: 21003 },
      'SK': { name: 'Saskatchewan', basicPersonal: 17661 },
      'MB': { name: 'Manitoba', basicPersonal: 15000 },
      'QC': { name: 'Quebec', basicPersonal: 18056 },
      'NB': { name: 'New Brunswick', basicPersonal: 12458 },
      'NS': { name: 'Nova Scotia', basicPersonal: 8744 },
      'PE': { name: 'Prince Edward Island', basicPersonal: 12500 },
      'NL': { name: 'Newfoundland and Labrador', basicPersonal: 10382 },
      'YT': { name: 'Yukon', basicPersonal: 15705 },
      'NT': { name: 'Northwest Territories', basicPersonal: 16593 },
      'NU': { name: 'Nunavut', basicPersonal: 18767 }
    };
    return provinceData[province] || provinceData['ON'];
  }

  getProvinceName(province) {
    return this.getProvinceInfo(province).name;
  }

  getSalesTaxInfo(province) {
    const salesTax = {
      'ON': 'HST: 13%', 'BC': 'GST: 5% + PST: 7%', 'AB': 'GST: 5%',
      'SK': 'GST: 5% + PST: 6%', 'MB': 'GST: 5% + PST: 7%',
      'QC': 'GST: 5% + QST: 9.975%', 'NB': 'HST: 15%', 'NS': 'HST: 15%',
      'PE': 'HST: 15%', 'NL': 'HST: 15%', 'YT': 'GST: 5%',
      'NT': 'GST: 5%', 'NU': 'GST: 5%'
    };
    return salesTax[province] || 'GST: 5%';
  }

  getProvincialTaxRates(province) {
    const rates = {
      'ON': '5.05% - 13.16%', 'BC': '5.06% - 20.5%', 'AB': '10%',
      'SK': '10.5% - 14.5%', 'MB': '10.75% - 17.4%', 'QC': '14% - 25.75%',
      'NB': '9.5% - 19.5%', 'NS': '8.79% - 21%', 'PE': '9.8% - 16.7%',
      'NL': '8.7% - 21.3%', 'YT': '6.4% - 15%', 'NT': '5.9% - 14.05%', 'NU': '4% - 11.5%'
    };
    return rates[province] || rates['ON'];
  }

  getProvincialCredits(province) {
    const credits = {
      'ON': '• Ontario Health Premium\n• Ontario Trillium Benefit\n• Northern Ontario Energy Credit',
      'BC': '• BC Climate Action Tax Credit\n• BC Low Income Tax Reduction\n• BC Training Tax Credit',
      'AB': '• Alberta Family Employment Tax Credit\n• Alberta Child Benefit',
      'QC': '• Quebec Parental Insurance Plan\n• Quebec Pension Plan\n• Solidarity Tax Credit',
      'default': '• Various provincial credits available\n• Low-income tax reductions\n• Senior and disability credits'
    };
    return credits[province] || credits['default'];
  }

  // Helper functions
  isGreeting(message) {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'bonjour'];
    return greetings.some(greeting => message.includes(greeting));
  }

  extractSuggestedActions(responseText, profile) {
    const actions = [];
    const text = responseText.toLowerCase();
    
    if (text.includes('rrsp')) actions.push('Calculate RRSP contribution room');
    if (text.includes('tfsa')) actions.push('Check TFSA room');
    if (text.includes('document') || text.includes('t4') || text.includes('t5')) actions.push('Upload tax documents');
    if (text.includes('calculate') || text.includes('tax')) actions.push('Use tax calculator');
    if (text.includes('deadline')) actions.push('Review important deadlines');
    if (text.includes('deduction')) actions.push('Find available deductions');
    if (text.includes('province')) actions.push('Compare provincial taxes');
    
    if (actions.length === 0) {
      actions.push('Ask another tax question', 'Use tax calculator', 'Upload documents', 'Learn about RRSP');
    }
    
    return actions.slice(0, 4); // Limit to 4 actions
  }

  updateUserProfile(userId, context) {
    const existing = this.userProfiles.get(userId) || {};
    const updated = {
      ...existing,
      ...context,
      lastInteraction: new Date(),
      interactionCount: (existing.interactionCount || 0) + 1
    };
    this.userProfiles.set(userId, updated);
  }

  getFallbackResponse(message) {
    return {
      message: "I'm here to help with your Canadian tax questions! 🇨🇦 I can assist with CRA regulations, tax calculations, RRSP planning, deductions, and more. Could you please rephrase your question or try asking about a specific tax topic like RRSP contributions, tax deadlines, or available deductions?",
      confidence: 75,
      sources: ['Canadian Tax AI Assistant'],
      aiInsight: true,
      suggestedActions: ['Ask about RRSP', 'Calculate taxes', 'Upload documents', 'Learn about deductions'],
      responseType: 'fallback'
    };
  }

  // Conversation management
  getConversationHistory(userId) {
    return this.conversationHistory.get(userId) || [];
  }

  clearConversationHistory(userId) {
    this.conversationHistory.delete(userId);
    this.userProfiles.delete(userId);
    return true;
  }

  getUserProfile(userId) {
    return this.userProfiles.get(userId) || {};
  }

  // Performance monitoring
  getStats() {
    return {
      activeConversations: this.conversationHistory.size,
      userProfiles: this.userProfiles.size,
      cacheSize: this.responseCache.size,
      openaiEnabled: !!openai
    };
  }
}

// Export the enhanced AI chatbot
const enhancedCanadianTaxAI = new EnhancedCanadianTaxAI();

module.exports = {
  enhancedCanadianTaxAI,
  EnhancedCanadianTaxAI
};