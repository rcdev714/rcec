import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chatWithEnterpriseAgent, getEnterpriseAgentGraph } from '@/lib/agents/enterprise-agent'
import { HumanMessage, AIMessage } from '@langchain/core/messages'

// Mock Google Gemini API
const mockGeminiInvoke = vi.fn()
vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    invoke: mockGeminiInvoke,
    bindTools: vi.fn(function(this: any) { return this; }),
  })),
}))

// Mock tools
vi.mock('@/lib/tools/company-tools', () => ({
  companyTools: [],
}))

vi.mock('@/lib/tools/web-search', () => ({
  webSearchTool: {},
  webExtractTool: {},
}))

vi.mock('@/lib/tools/contact-tools', () => ({
  enrichCompanyContactsTool: {},
}))

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { 
        user: { 
          id: 'test-user-123',
          email: 'test@example.com',
        } 
      },
      error: null
    }),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ 
      data: { plan: 'PRO', status: 'active' },
      error: null 
    }),
  })),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

vi.mock('@/lib/tools/perplexity-search', () => ({
  perplexitySearchTool: {},
}))

vi.mock('@/lib/agents/enterprise-agent/checkpointer', () => ({
  SupabaseCheckpointSaver: vi.fn().mockImplementation(() => ({
    getTuple: vi.fn().mockResolvedValue(undefined),
    putWrites: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('Enterprise Agent Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGeminiInvoke.mockResolvedValue(
      new AIMessage('Respuesta del agente.')
    )
  })

  describe('Graph Construction', () => {
    it('should build the enterprise agent graph successfully', () => {
      const graph = getEnterpriseAgentGraph()
      
      expect(graph).toBeDefined()
      expect(graph.invoke).toBeDefined()
      expect(graph.stream).toBeDefined()
    })
  })

  describe('Chat Workflow', () => {
    it('should process a simple user query', async () => {
      mockGeminiInvoke.mockResolvedValueOnce(
        new AIMessage('Hola, ¿en qué puedo ayudarte hoy?')
      )

      const stream = await chatWithEnterpriseAgent(
        'Hola',
        [],
        { userId: 'test-user-123', conversationId: 'test-1' }
      )

      expect(stream).toBeDefined()
      expect(stream.getReader).toBeDefined()

      const reader = stream.getReader()
      const { value, done } = await reader.read()
      
      expect(done).toBe(false)
      expect(value).toBeDefined()
      
      reader.releaseLock()
    }, 15000)

    it('should handle conversation history', async () => {
      const history = [
        new HumanMessage('Hola'),
        new AIMessage('Hola, ¿en qué puedo ayudarte?'),
      ]

      mockGeminiInvoke.mockResolvedValueOnce(
        new AIMessage('Claro, puedo ayudarte con eso.')
      )

      const stream = await chatWithEnterpriseAgent(
        'Busca empresas en Guayaquil',
        history,
        { userId: 'test-user-123', conversationId: 'test-2' }
      )

      expect(stream).toBeDefined()
      
      const reader = stream.getReader()
      const { value } = await reader.read()
      
      expect(value).toBeDefined()
      reader.releaseLock()
    }, 15000)
  })

  describe('Stream Output', () => {
    it('should stream responses', async () => {
      mockGeminiInvoke.mockResolvedValueOnce(
        new AIMessage('Esta es una respuesta de prueba.')
      )

      const stream = await chatWithEnterpriseAgent(
        'Test query',
        [],
        { userId: 'test-user-123', conversationId: 'test-stream' }
      )

      const reader = stream.getReader()
      let chunks = 0
      
      try {
        while (chunks < 5) {
          const { value, done } = await reader.read()
          if (done) break
          if (value) chunks++
        }
      } finally {
        reader.releaseLock()
      }

      expect(chunks).toBeGreaterThan(0)
    }, 15000)
  })

  describe('Configuration', () => {
    it('should accept conversation ID and user ID', async () => {
      mockGeminiInvoke.mockResolvedValueOnce(
        new AIMessage('Test response')
      )

      const stream = await chatWithEnterpriseAgent(
        'Test',
        [],
        {
          userId: 'test-user-123',
          conversationId: 'specific-conversation-id',
          projectName: 'Test Project',
          runName: 'Test Run'
        }
      )

      expect(stream).toBeDefined()
      
      const reader = stream.getReader()
      await reader.read()
      reader.releaseLock()
    }, 15000)
  })
})
