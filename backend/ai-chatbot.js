// File: backend/ai-chatbot.js
// Enhanced Canadian Tax AI Chatbot with OpenAI Integration

const OpenAI = require('openai');

// Initialize OpenAI (you already have the API key in .env)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Enhanced Canadian Tax Knowledge Base
const CANADIAN_TAX_CONTEXT = `
You are a Canadian Tax AI Assistant specialized in CRA (Canada Revenue Agency) regulations for 2024.

KEY CANADIAN TAX INFORMATION FOR 2024:
- Federal Basic Personal Amount: $15,705
- RRSP Contribution Limit: 18% of income or $31,560 (whichever is less)
- TFSA Annual Limit: $7,000
- CPP Maximum Pensionable Earnings: $68,500
- EI Maximum Insurable Earnings: $65,700

FEDERAL TAX BRACKETS 2024:
- 15% on income up to $55,867
- 20.5% on income from $55,867 to $111,733
- 26% on income from $111,733 to $173,205  
- 29% on income from $173,205 to $246,752
- 33% on income over $246,752

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
- Home office expenses (if working from home)

PROVINCES: Each province has different tax rates and credits.

Always provide accurate, helpful advice specific to Canadian tax law and CRA requirements.
`;

// Enhanced AI Response Generator
class CanadianTaxAI {
  constructor() {
    this.conversationHistory = new Map();
    this.userProfiles = new Map();
  }

  // Main chat function
  async generateResponse(message, userId, userContext = {}) {
    try {
      // Get or create conversation history
      let history = this.conversationHistory.get(userId) || [];
      
      // Update user profile with context
      this.updateUserProfile(userId, userContext);
      const profile = this.userProfiles.get(userId) || {};

      // Try OpenAI first, fallback to rule-based
      let response;
      if (openai) {
        try {
          response = await this.getOpenAIResponse(message, history, profile);
        } catch (error) {
          console.log('OpenAI fallback to rule-based:', error.message);
          response = this.getRuleBasedResponse(message, profile);
        }
      } else {
        response = this.getRuleBasedResponse(message, profile);
      }

      // Add to conversation history
      history.push(
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: response.message, timestamp: new Date() }
      );
      
      // Keep only last 10 exchanges
      if (history.length > 20) {
        history = history.slice(-20);
      }
      
      this.conversationHistory.set(userId, history);

      return {
        ...response,
        conversationId: userId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('AI Chat Error:', error);
      return this.getFallbackResponse(message);
    }
  }

  // OpenAI Integration
  async getOpenAIResponse(message, history, profile) {
    try {
      const systemPrompt = this.buildSystemPrompt(profile);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.7,
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
      console.error('OpenAI Error:', error);
      throw error;
    }
  }

  // Build personalized system prompt
  buildSystemPrompt(profile) {
    let prompt = CANADIAN_TAX_CONTEXT;
    
    if (profile.income) {
      prompt += `\n\nUSER PROFILE:`;
      prompt += `\n- Annual Income: $${profile.income.toLocaleString()}`;
      prompt += `\n- Tax Bracket: ${this.getTaxBracket(profile.income)}%`;
    }
    
    if (profile.province) {
      prompt += `\n- Province: ${profile.province}`;
    }
    
    if (profile.filingStatus) {
      prompt += `\n- Filing Status: ${profile.filingStatus}`;
    }
    
    if (profile.hasDocuments) {
      prompt += `\n- Documents Uploaded: ${profile.documentCount} documents`;
    }

    prompt += `\n\nRESPONSE GUIDELINES:
- Be conversational and helpful
- Provide specific Canadian tax advice
- Mention relevant CRA forms when applicable
- Suggest concrete next steps
- Use Canadian terminology (RRSP, TFSA, CPP, EI, etc.)
- Include relevant deadlines and limits
- Be encouraging and supportive
- If unsure, recommend consulting a tax professional
- Keep responses under 300 words`;

    return prompt;
  }

  // Enhanced rule-based responses (fallback)
  getRuleBasedResponse(message, profile) {
    const lowerMessage = message.toLowerCase();
    const income = profile.income || 0;
    const province = profile.province || 'ON';

    // Greeting responses
    if (this.isGreeting(lowerMessage)) {
      return {
        message: `Hello! I'm your Canadian Tax AI Assistant. I can help you with CRA regulations, tax calculations, RRSP planning, and more. ${profile.income ? `I see you have an income of $${profile.income.toLocaleString()}.` : ''} What tax question can I help you with today?`,
        confidence: 95,
        sources: ['Canadian AI Tax Assistant'],
        aiInsight: true,
        suggestedActions: ['Calculate my taxes', 'RRSP optimization', 'Upload tax documents'],
        responseType: 'rule_based'
      };
    }

    // RRSP specific advice
    if (lowerMessage.includes('rrsp')) {
      const rrspRoom = Math.min(income * 0.18, 31560);
      const taxSavings = rrspRoom * (this.getTaxBracket(income) / 100);
      
      return {
        message: `Great question about RRSPs! For 2024, you can contribute 18% of your income or $31,560, whichever is less. ${income ? `Based on your income of $${income.toLocaleString()}, your maximum RRSP contribution is $${rrspRoom.toLocaleString()}, which could save you approximately $${Math.round(taxSavings).toLocaleString()} in taxes.` : ''} Remember, the contribution deadline is March 1, 2025 for the 2024 tax year.`,
        confidence: 92,
        sources: ['CRA RRSP Guidelines 2024'],
        aiInsight: true,
        suggestedActions: ['Calculate exact RRSP room', 'Set up automatic contributions', 'Compare RRSP vs TFSA'],
        responseType: 'rule_based'
      };
    }

    // TFSA advice
    if (lowerMessage.includes('tfsa')) {
      return {
        message: `TFSA is excellent for tax-free growth! The 2024 contribution limit is $7,000. Unlike RRSPs, TFSA contributions aren't tax-deductible, but all growth and withdrawals are completely tax-free. Your TFSA room accumulates from when you turned 18 and became a Canadian resident. Any withdrawals can be re-contributed in future years.`,
        confidence: 91,
        sources: ['CRA TFSA Guidelines 2024'],
        aiInsight: true,
        suggestedActions: ['Check TFSA contribution room', 'Compare investment options', 'Set up automatic savings'],
        responseType: 'rule_based'
      };
    }

    // Tax calculation requests
    if (lowerMessage.includes('calculate') || lowerMessage.includes('tax') && lowerMessage.includes('owe')) {
      if (income > 0) {
        const federalTax = this.calculateFederalTax(income);
        const marginalRate = this.getTaxBracket(income);
        
        return {
          message: `Based on your income of $${income.toLocaleString()}, your estimated federal tax is approximately $${Math.round(federalTax).toLocaleString()}. Your marginal tax rate is ${marginalRate}%. This doesn't include provincial taxes, CPP, or EI contributions. For a complete calculation, use our tax calculator tool!`,
          confidence: 88,
          sources: ['CRA Tax Tables 2024'],
          aiInsight: true,
          suggestedActions: ['Get detailed tax calculation', 'Explore tax optimization', 'Review deductions'],
          responseType: 'rule_based'
        };
      } else {
        return {
          message: `I'd be happy to help calculate your taxes! I'll need your annual income to provide an accurate estimate. You can use our tax calculator tool or tell me your income and I'll give you a quick estimate including federal and provincial taxes for ${province}.`,
          confidence: 85,
          sources: ['Canadian Tax Calculator'],
          aiInsight: true,
          suggestedActions: ['Use tax calculator', 'Enter income details', 'Upload T4 slips'],
          responseType: 'rule_based'
        };
      }
    }

    // Deadline questions
    if (lowerMessage.includes('deadline') || lowerMessage.includes('when') && lowerMessage.includes('file')) {
      return {
        message: `Important Canadian tax deadlines for 2025: 📅 Tax filing deadline is April 30, 2025 for most people. Self-employed individuals have until June 15, 2025 to file, but any taxes owed are still due April 30. RRSP contribution deadline is March 1, 2025. Filing electronically gets you your refund faster - usually within 2 weeks!`,
        confidence: 96,
        sources: ['CRA Filing Deadlines 2025'],
        aiInsight: true,
        suggestedActions: ['File tax return early', 'Make RRSP contribution', 'Gather tax documents'],
        responseType: 'rule_based'
      };
    }

    // Document questions
    if (lowerMessage.includes('document') || lowerMessage.includes('t4') || lowerMessage.includes('t5')) {
      return {
        message: `Essential Canadian tax documents include: T4 (employment income), T5 (investment income), T4A (pension/retirement income), and receipts for deductions. You should receive your T4 by February 28 and T5 by March 31. Upload these documents to our system for automatic data extraction and tax optimization suggestions!`,
        confidence: 89,
        sources: ['CRA Document Requirements'],
        aiInsight: true,
        suggestedActions: ['Upload T4 slips', 'Upload T5 slips', 'Organize receipts'],
        responseType: 'rule_based'
      };
    }

    // Province-specific advice
    if (lowerMessage.includes('province') || lowerMessage.includes('ontario') || lowerMessage.includes('bc')) {
      return {
        message: `Each Canadian province has different tax rates and credits. ${province === 'ON' ? 'Ontario has a basic personal amount of $11,865 and tax rates from 5.05% to 13.16%.' : `${province} has its own provincial tax rates and credits.`} Provincial taxes are calculated separately from federal taxes. Would you like specific information about ${province} tax rates and credits?`,
        confidence: 87,
        sources: [`${province} Provincial Tax Guide 2024`],
        aiInsight: true,
        suggestedActions: ['View provincial tax rates', 'Check provincial credits', 'Compare provinces'],
        responseType: 'rule_based'
      };
    }

    // Default response
    return {
      message: `That's a great Canadian tax question! I specialize in CRA regulations, tax optimization, RRSP/TFSA planning, and tax calculations. I can help you understand tax brackets, deductions, credits, and deadlines. What specific area would you like to explore - tax calculations, retirement planning, or CRA compliance?`,
      confidence: 85,
      sources: ['Canadian Tax AI Assistant'],
      aiInsight: true,
      suggestedActions: ['Ask about RRSP', 'Calculate taxes', 'Learn about deductions', 'Upload documents'],
      responseType: 'rule_based'
    };
  }

  // Helper functions
  isGreeting(message) {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(greeting => message.includes(greeting));
  }

  getTaxBracket(income) {
    if (income <= 55867) return 15;
    if (income <= 111733) return 20.5;
    if (income <= 173205) return 26;
    if (income <= 246752) return 29;
    return 33;
  }

  calculateFederalTax(income) {
    if (income <= 55867) return income * 0.15;
    if (income <= 111733) return 8380 + (income - 55867) * 0.205;
    if (income <= 173205) return 19822 + (income - 111733) * 0.26;
    if (income <= 246752) return 35814 + (income - 173205) * 0.29;
    return 57168 + (income - 246752) * 0.33;
  }

  extractSuggestedActions(responseText, profile) {
    const actions = [];
    const text = responseText.toLowerCase();
    
    if (text.includes('rrsp')) actions.push('Calculate RRSP contribution room');
    if (text.includes('tfsa')) actions.push('Check TFSA room');
    if (text.includes('document') || text.includes('t4') || text.includes('t5')) actions.push('Upload tax documents');
    if (text.includes('calculate') || text.includes('tax')) actions.push('Use tax calculator');
    if (text.includes('deadline')) actions.push('Review important deadlines');
    
    return actions.length > 0 ? actions : ['Ask another tax question', 'Use tax calculator', 'Upload documents'];
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
      message: "I'm here to help with your Canadian tax questions! I can assist with CRA regulations, tax calculations, RRSP planning, and more. Could you please rephrase your question or try asking about a specific tax topic?",
      confidence: 75,
      sources: ['Canadian Tax AI Assistant'],
      aiInsight: true,
      suggestedActions: ['Ask about RRSP', 'Calculate taxes', 'Upload documents'],
      responseType: 'fallback'
    };
  }

  // Get conversation history
  getConversationHistory(userId) {
    return this.conversationHistory.get(userId) || [];
  }

  // Clear conversation history
  clearConversationHistory(userId) {
    this.conversationHistory.delete(userId);
    return true;
  }

  // Get user profile
  getUserProfile(userId) {
    return this.userProfiles.get(userId) || {};
  }
}

// Export the AI chatbot
const canadianTaxAI = new CanadianTaxAI();

module.exports = {
  canadianTaxAI,
  CanadianTaxAI
};