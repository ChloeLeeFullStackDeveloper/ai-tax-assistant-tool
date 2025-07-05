const OpenAI = require('openai');
require('dotenv').config();

class EnhancedCanadianTaxAI {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }) : null;
    
    this.conversationHistory = new Map();
    this.responseCache = new Map();
    this.stats = {
      totalRequests: 0,
      successfulResponses: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      startTime: new Date()
    };
    
    console.log('🤖 Enhanced Canadian Tax AI initialized');
    console.log(`📡 OpenAI Status: ${this.openai ? 'Connected' : 'Not configured'}`);
  }

  // Canadian Tax Knowledge Base
  getTaxKnowledgeBase() {
    return {
      rrsp: {
        keywords: ['rrsp', 'registered retirement', 'retirement savings', 'contribution room'],
        response: (context) => {
          const income = context.income || 0;
          const rrspRoom = Math.min(income * 0.18, 31560);
          const taxSavings = rrspRoom * (this.getMarginalRate(income) / 100);
          
          return `🏦 RRSP Advice for ${context.province || 'Canada'}:\n\n` +
                 `📊 Your Details:\n` +
                 `• Income: $${income.toLocaleString()}\n` +
                 `• Max RRSP Room: $${rrspRoom.toLocaleString()}\n` +
                 `• Potential Tax Savings: $${Math.round(taxSavings).toLocaleString()}\n\n` +
                 `✅ Key Benefits:\n` +
                 `• Tax deduction for contributions\n` +
                 `• Tax-deferred growth\n` +
                 `• Contribution deadline: March 1, 2025\n\n` +
                 `💡 Tip: Contributing your maximum RRSP room could save you $${Math.round(taxSavings)} in taxes!`;
        }
      },
      tfsa: {
        keywords: ['tfsa', 'tax free savings', 'tfsa limit', 'tax-free'],
        response: (context) => {
          return `🏦 TFSA Guidance for ${context.province || 'Canada'}:\n\n` +
                 `📊 2024 TFSA Details:\n` +
                 `• Annual Contribution Limit: $7,000\n` +
                 `• Tax-free growth and withdrawals\n` +
                 `• No tax deduction for contributions\n` +
                 `• Contribution room accumulates from age 18\n\n` +
                 `✅ Best Uses:\n` +
                 `• Emergency fund\n` +
                 `• Short to medium-term goals\n` +
                 `• Tax-free investment growth\n\n` +
                 `💡 Tip: Unlike RRSP, you can withdraw and re-contribute to TFSA without penalty!`;
        }
      },
      brackets: {
        keywords: ['tax brackets', 'tax rates', 'marginal tax', 'income tax'],
        response: (context) => {
          const province = context.province || 'ON';
          return `📊 Canadian Tax Brackets for 2024:\n\n` +
                 `🇨🇦 Federal Tax Brackets:\n` +
                 `• 15% on income up to $55,867\n` +
                 `• 20.5% on income $55,867 - $111,733\n` +
                 `• 26% on income $111,733 - $173,205\n` +
                 `• 29% on income $173,205 - $246,752\n` +
                 `• 33% on income over $246,752\n\n` +
                 `🏛️ Provincial rates vary by province.\n` +
                 `📍 Your province: ${this.getProvinceName(province)}\n\n` +
                 `💡 Remember: These are marginal rates - you don't pay the top rate on all your income!`;
        }
      },
      deadline: {
        keywords: ['deadline', 'due date', 'filing deadline', 'when to file'],
        response: (context) => {
          return `📅 Important Canadian Tax Deadlines:\n\n` +
                 `🗓️ Individual Tax Returns:\n` +
                 `• Filing Deadline: April 30, 2025\n` +
                 `• Payment Due: April 30, 2025\n\n` +
                 `🏢 Self-Employed:\n` +
                 `• Filing Deadline: June 15, 2025\n` +
                 `• Payment Still Due: April 30, 2025\n\n` +
                 `💰 RRSP Contributions:\n` +
                 `• Deadline: March 1, 2025\n\n` +
                 `⚠️ Late filing penalties apply, so don't miss these dates!`;
        }
      },
      deductions: {
        keywords: ['deductions', 'tax deductions', 'write offs', 'expenses'],
        response: (context) => {
          return `💰 Common Canadian Tax Deductions:\n\n` +
                 `🏠 Home Office (if working from home):\n` +
                 `• Rent, utilities, maintenance\n` +
                 `• Office supplies and equipment\n\n` +
                 `👨‍👩‍👧‍👦 Family Related:\n` +
                 `• Childcare expenses\n` +
                 `• Medical expenses (over 3% of income)\n\n` +
                 `🎓 Education & Professional:\n` +
                 `• Tuition fees\n` +
                 `• Professional development\n\n` +
                 `❤️ Charitable Donations\n` +
                 `📦 Moving Expenses (work-related)\n\n` +
                 `💡 Keep all receipts and consider speaking with a tax professional!`;
        }
      },
      cpp: {
        keywords: ['cpp', 'canada pension', 'pension plan', 'contributions'],
        response: (context) => {
          const income = context.income || 0;
          const cppContribution = Math.min(Math.max(0, income - 3500) * 0.0595, 4055);
          
          return `🏛️ Canada Pension Plan (CPP) for 2024:\n\n` +
                 `📊 CPP Details:\n` +
                 `• Maximum pensionable earnings: $68,500\n` +
                 `• Contribution rate: 5.95% (employee)\n` +
                 `• Basic exemption: $3,500\n` +
                 `• Maximum contribution: $4,055\n\n` +
                 `💰 Your CPP contribution: $${Math.round(cppContribution).toLocaleString()}\n\n` +
                 `✅ Benefits:\n` +
                 `• Retirement pension\n` +
                 `• Disability benefits\n` +
                 `• Survivor benefits`;
        }
      },
      ei: {
        keywords: ['ei', 'employment insurance', 'ei premium', 'unemployment'],
        response: (context) => {
          const income = context.income || 0;
          const eiContribution = Math.min(income * 0.0229, 1505);
          
          return `🛡️ Employment Insurance (EI) for 2024:\n\n` +
                 `📊 EI Details:\n` +
                 `• Maximum insurable earnings: $65,700\n` +
                 `• Premium rate: 2.29% (employee)\n` +
                 `• Maximum premium: $1,505\n\n` +
                 `💰 Your EI premium: $${Math.round(eiContribution).toLocaleString()}\n\n` +
                 `✅ Coverage:\n` +
                 `• Regular benefits (unemployment)\n` +
                 `• Maternity/parental benefits\n` +
                 `• Sickness benefits`;
        }
      }
    };
  }

  // Helper methods
  getMarginalRate(income) {
    if (income <= 55867) return 15;
    if (income <= 111733) return 20.5;
    if (income <= 173205) return 26;
    if (income <= 246752) return 29;
    return 33;
  }

  getProvinceName(code) {
    const provinces = {
      'ON': 'Ontario', 'BC': 'British Columbia', 'AB': 'Alberta',
      'SK': 'Saskatchewan', 'MB': 'Manitoba', 'QC': 'Quebec',
      'NB': 'New Brunswick', 'NS': 'Nova Scotia', 'PE': 'Prince Edward Island',
      'NL': 'Newfoundland and Labrador', 'YT': 'Yukon',
      'NT': 'Northwest Territories', 'NU': 'Nunavut'
    };
    return provinces[code] || 'Canada';
  }

  // Main response generation
  async generateResponse(message, userId, context = {}) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Check cache first
      const cacheKey = `${message.toLowerCase().trim()}_${JSON.stringify(context)}`;
      if (this.responseCache.has(cacheKey)) {
        this.stats.cacheHits++;
        const cachedResponse = this.responseCache.get(cacheKey);
        return {
          ...cachedResponse,
          fromCache: true,
          timestamp: new Date().toISOString()
        };
      }

      // Check knowledge base first
      const knowledgeResponse = this.checkKnowledgeBase(message, context);
      if (knowledgeResponse) {
        const response = {
          message: knowledgeResponse.message,
          confidence: knowledgeResponse.confidence,
          sources: knowledgeResponse.sources,
          aiInsight: true,
          suggestedActions: knowledgeResponse.suggestedActions,
          responseType: knowledgeResponse.responseType,
          timestamp: new Date().toISOString(),
          conversationId: this.getConversationId(userId)
        };

        // Cache the response
        this.responseCache.set(cacheKey, response);
        this.stats.successfulResponses++;
        this.updateAverageResponseTime(startTime);
        
        return response;
      }

      // If OpenAI is available, use it
      if (this.openai) {
        const aiResponse = await this.generateOpenAIResponse(message, userId, context);
        
        // Cache the response
        this.responseCache.set(cacheKey, aiResponse);
        this.stats.successfulResponses++;
        this.updateAverageResponseTime(startTime);
        
        return aiResponse;
      }

      // Fallback response
      const fallbackResponse = this.generateFallbackResponse(message, context);
      this.stats.successfulResponses++;
      this.updateAverageResponseTime(startTime);
      
      return fallbackResponse;

    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.generateErrorResponse(message, context);
    }
  }

  // Check knowledge base for matching response
  checkKnowledgeBase(message, context) {
    const lowerMessage = message.toLowerCase();
    const knowledgeBase = this.getTaxKnowledgeBase();

    // Check for greetings
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return {
        message: `Hello ${context.userName || 'there'}! 🇨🇦\n\nI'm your Canadian Tax AI Assistant, specialized in CRA regulations and ${this.getProvinceName(context.province)} tax laws.\n\n💡 I can help you with:\n• Tax calculations and planning\n• RRSP and TFSA optimization\n• Deductions and credits\n• Filing deadlines and requirements\n\nWhat tax question can I help you with today?`,
        confidence: 95,
        sources: ['Canadian Tax AI Assistant'],
        suggestedActions: ['Calculate my taxes', 'RRSP advice', 'Tax deductions', 'Filing requirements'],
        responseType: 'greeting'
      };
    }

    // Check knowledge base entries
    for (const [key, data] of Object.entries(knowledgeBase)) {
      if (data.keywords.some(keyword => lowerMessage.includes(keyword))) {
        return {
          message: typeof data.response === 'function' ? data.response(context) : data.response,
          confidence: 92,
          sources: ['Canadian Tax Knowledge Base'],
          suggestedActions: ['Calculate taxes', 'Get more details', 'Ask another question'],
          responseType: key
        };
      }
    }

    return null;
  }

  // Generate OpenAI response
  async generateOpenAIResponse(message, userId, context) {
    const systemPrompt = `You are a Canadian Tax AI Assistant specialized in CRA regulations for 2024. 
    
    User Context:
    - Name: ${context.userName || 'User'}
    - Province: ${this.getProvinceName(context.province)}
    - Income: ${context.income ? `$${context.income.toLocaleString()}` : 'Not provided'}
    - Filing Status: ${context.filingStatus || 'Not specified'}
    
    Always provide accurate Canadian tax advice, mention specific 2024 rates and limits, and suggest actionable next steps.
    Keep responses concise but informative, and always include relevant CRA references.`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    
    return {
      message: response,
      confidence: 88,
      sources: ['OpenAI GPT-4', 'Canadian Tax AI Assistant'],
      aiInsight: true,
      suggestedActions: ['Calculate taxes', 'Get more details', 'Ask follow-up question'],
      responseType: 'openai_response',
      timestamp: new Date().toISOString(),
      conversationId: this.getConversationId(userId),
      tokens_used: completion.usage.total_tokens
    };
  }

  // Generate fallback response
  generateFallbackResponse(message, context) {
    return {
      message: `I understand you're asking about Canadian tax matters! 🇨🇦\n\nAs your CRA specialist, I can help you with:\n\n📊 Tax Calculations & Planning\n🏦 RRSP and TFSA Optimization\n💰 Deductions and Credits\n📅 Filing Deadlines\n🏛️ Provincial Tax Differences\n\nCould you be more specific about what you'd like to know? For example:\n• "What's my RRSP contribution limit?"\n• "How much tax will I pay on $75,000?"\n• "What deductions can I claim?"\n\nI'm here to help make Canadian taxes easier! 🍁`,
      confidence: 75,
      sources: ['Canadian Tax AI Assistant'],
      aiInsight: true,
      suggestedActions: ['Calculate my taxes', 'RRSP planning', 'Find deductions', 'Tax deadlines'],
      responseType: 'fallback',
      timestamp: new Date().toISOString(),
      conversationId: this.getConversationId(userId)
    };
  }

  // Generate error response
  generateErrorResponse(message, context) {
    return {
      message: `I apologize, but I'm having trouble processing your request right now. 😔\n\nLet me try to help with general Canadian tax guidance instead!\n\n🇨🇦 Quick Tax Tips:\n• Tax filing deadline: April 30, 2025\n• RRSP deadline: March 1, 2025\n• TFSA limit 2024: $7,000\n• Basic personal amount: $15,705\n\nPlease try rephrasing your question, and I'll do my best to help! 🍁`,
      confidence: 60,
      sources: ['Canadian Tax AI Assistant'],
      aiInsight: true,
      suggestedActions: ['Try again', 'Calculate taxes', 'Ask about RRSP', 'Tax deadlines'],
      responseType: 'error',
      timestamp: new Date().toISOString(),
      conversationId: this.getConversationId(userId)
    };
  }

  // Conversation management
  getConversationId(userId) {
    return `conv_${userId}_${Date.now()}`;
  }

  getConversationHistory(userId) {
    return this.conversationHistory.get(userId) || [];
  }

  addToConversationHistory(userId, message, response) {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }
    
    const history = this.conversationHistory.get(userId);
    history.push({
      timestamp: new Date().toISOString(),
      message,
      response: response.message,
      confidence: response.confidence
    });
    
    // Keep only last 50 messages
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.conversationHistory.set(userId, history);
  }

  clearConversationHistory(userId) {
    const hadHistory = this.conversationHistory.has(userId);
    this.conversationHistory.delete(userId);
    return hadHistory;
  }

  // Stats and monitoring
  updateAverageResponseTime(startTime) {
    const responseTime = Date.now() - startTime;
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.successfulResponses - 1) + responseTime) / 
      this.stats.successfulResponses;
  }

  getStats() {
    return {
      ...this.stats,
      cacheSize: this.responseCache.size,
      activeConversations: this.conversationHistory.size,
      uptime: Date.now() - this.stats.startTime.getTime()
    };
  }

  // Cleanup methods
  clearCache() {
    this.responseCache.clear();
  }

  clearExpiredCache(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const now = Date.now();
    for (const [key, value] of this.responseCache.entries()) {
      if (now - new Date(value.timestamp).getTime() > maxAge) {
        this.responseCache.delete(key);
      }
    }
  }
}

// Create singleton instance
const enhancedCanadianTaxAI = new EnhancedCanadianTaxAI();

// Export the instance
module.exports = {
  enhancedCanadianTaxAI
};

// Clean up cache every hour
setInterval(() => {
  enhancedCanadianTaxAI.clearExpiredCache();
}, 60 * 60 * 1000);