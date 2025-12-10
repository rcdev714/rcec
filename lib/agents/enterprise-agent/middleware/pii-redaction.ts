/**
 * PII Redaction Middleware for LATAM Data
 * 
 * Provides automatic PII detection and redaction for:
 * - Ecuadorian RUCs (13-digit tax IDs)
 * - Cédulas (10-digit national IDs)
 * - Email addresses
 * - Phone numbers (Ecuador and international)
 * - Credit card numbers
 * - Bank account numbers
 * 
 * Features:
 * - Automatic redaction in messages before LLM processing
 * - Reversible redaction for tool execution
 * - Audit logging for compliance
 * 
 * @module pii-redaction
 */

import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

// ============================================================================
// TYPES
// ============================================================================

export interface PIIRule {
  /** Unique name for this PII type */
  name: string;
  /** Regex pattern to match */
  pattern: RegExp;
  /** Placeholder format for redaction (e.g., "[RUC_REDACTED_1]") */
  placeholder: string;
  /** Whether this rule is enabled */
  enabled: boolean;
  /** Strategy: 'redact' replaces with placeholder, 'mask' partially hides */
  strategy: 'redact' | 'mask';
  /** Custom mask function for 'mask' strategy */
  maskFn?: (value: string) => string;
  /** Validation function to reduce false positives */
  validate?: (value: string) => boolean;
}

export interface PIIRedactionConfig {
  /** PII detection rules */
  rules: Record<string, PIIRule>;
  /** Apply redaction to user input */
  applyToInput?: boolean;
  /** Apply redaction to LLM output */
  applyToOutput?: boolean;
  /** Apply redaction to tool inputs */
  applyToToolInputs?: boolean;
  /** Restore original values in tool inputs (for tools that need them) */
  restoreForTools?: string[];
  /** Log redaction events for audit */
  enableAuditLog?: boolean;
  /** Custom audit log handler */
  onAudit?: (event: PIIAuditEvent) => void;
}

export interface PIIAuditEvent {
  timestamp: Date;
  type: 'redaction' | 'restoration';
  piiType: string;
  location: 'input' | 'output' | 'tool_input' | 'tool_output';
  originalLength?: number;
  redactedValue?: string;
  context?: string;
}

export interface RedactionMap {
  /** Map from placeholder to original value */
  placeholderToOriginal: Map<string, string>;
  /** Map from original value to placeholder */
  originalToPlaceholder: Map<string, string>;
  /** Counter for generating unique placeholders */
  counters: Record<string, number>;
}

export interface RedactionResult {
  /** Redacted content */
  content: string;
  /** Number of redactions made */
  redactionCount: number;
  /** Types of PII found */
  piiTypesFound: string[];
  /** Audit events generated */
  auditEvents: PIIAuditEvent[];
}

// ============================================================================
// DEFAULT PII RULES FOR LATAM
// ============================================================================

/**
 * Default PII rules for Ecuador and Latin America
 */
export const LATAM_PII_RULES: Record<string, PIIRule> = {
  // Ecuadorian RUC (13 digits: 10 ID + 001 for natural persons or 3 additional for companies)
  ruc: {
    name: 'Ecuadorian RUC',
    pattern: /\b\d{13}\b/g,
    placeholder: '[RUC_REDACTED_{{n}}]',
    enabled: true,
    strategy: 'redact',
    validate: (value: string) => {
      // Basic RUC validation
      if (value.length !== 13) return false;
      // First 2 digits should be province code (01-24)
      const province = parseInt(value.substring(0, 2));
      return province >= 1 && province <= 24;
    },
  },
  
  // Ecuadorian Cédula (10 digits)
  cedula: {
    name: 'Ecuadorian Cédula',
    pattern: /\b\d{10}\b/g,
    placeholder: '[CEDULA_REDACTED_{{n}}]',
    enabled: true,
    strategy: 'redact',
    validate: (value: string) => {
      // Basic cédula validation
      if (value.length !== 10) return false;
      const province = parseInt(value.substring(0, 2));
      return province >= 1 && province <= 24;
    },
  },
  
  // Email addresses
  email: {
    name: 'Email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    placeholder: '[EMAIL_REDACTED_{{n}}]',
    enabled: true,
    strategy: 'mask',
    maskFn: (value: string) => {
      const [local, domain] = value.split('@');
      if (!domain) return '[EMAIL_REDACTED]';
      const maskedLocal = local.length > 2 
        ? local[0] + '***' + local[local.length - 1]
        : '***';
      return `${maskedLocal}@${domain}`;
    },
  },
  
  // Ecuador phone numbers (+593, 09XX, 0X)
  phoneEcuador: {
    name: 'Ecuador Phone',
    pattern: /(\+593|0593|0)?[\s.-]?([2-7]|9[0-9])[\s.-]?[0-9]{3}[\s.-]?[0-9]{3,4}/g,
    placeholder: '[PHONE_EC_REDACTED_{{n}}]',
    enabled: true,
    strategy: 'mask',
    maskFn: (value: string) => {
      const cleaned = value.replace(/[\s.-]/g, '');
      if (cleaned.length < 7) return '[PHONE_REDACTED]';
      // Show last 4 digits
      return `***-***-${cleaned.slice(-4)}`;
    },
  },
  
  // International phone numbers
  phoneInternational: {
    name: 'International Phone',
    pattern: /\+[1-9]\d{7,14}/g,
    placeholder: '[PHONE_INTL_REDACTED_{{n}}]',
    enabled: true,
    strategy: 'mask',
    maskFn: (value: string) => {
      if (value.length < 8) return '[PHONE_REDACTED]';
      return `${value.slice(0, 4)}***${value.slice(-4)}`;
    },
  },
  
  // Credit card numbers (basic patterns)
  creditCard: {
    name: 'Credit Card',
    pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
    placeholder: '[CARD_REDACTED_{{n}}]',
    enabled: true,
    strategy: 'mask',
    maskFn: (value: string) => {
      const cleaned = value.replace(/[- ]/g, '');
      if (cleaned.length < 16) return '[CARD_REDACTED]';
      return `****-****-****-${cleaned.slice(-4)}`;
    },
    validate: (value: string) => {
      // Luhn algorithm check for credit cards
      const cleaned = value.replace(/[- ]/g, '');
      if (!/^\d{13,19}$/.test(cleaned)) return false;
      
      let sum = 0;
      let isEven = false;
      for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i]);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }
      return sum % 10 === 0;
    },
  },
  
  // Bank account numbers (IBAN-like patterns)
  bankAccount: {
    name: 'Bank Account',
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/gi,
    placeholder: '[BANK_REDACTED_{{n}}]',
    enabled: true,
    strategy: 'mask',
    maskFn: (value: string) => {
      if (value.length < 10) return '[BANK_REDACTED]';
      return `${value.slice(0, 4)}****${value.slice(-4)}`;
    },
  },
  
  // Colombian NIT (9-11 digits)
  nitColombia: {
    name: 'Colombian NIT',
    pattern: /\b\d{9,11}-\d\b/g,
    placeholder: '[NIT_REDACTED_{{n}}]',
    enabled: true,
    strategy: 'redact',
  },
  
  // Peruvian RUC (11 digits)
  rucPeru: {
    name: 'Peruvian RUC',
    pattern: /\b(10|15|17|20)\d{9}\b/g,
    placeholder: '[RUC_PE_REDACTED_{{n}}]',
    enabled: true,
    strategy: 'redact',
    validate: (value: string) => {
      // Peruvian RUC starts with 10, 15, 17, or 20
      return /^(10|15|17|20)\d{9}$/.test(value);
    },
  },
};

// ============================================================================
// REDACTION ENGINE
// ============================================================================

/**
 * Create a new redaction map for tracking placeholder-to-original mappings
 */
export function createRedactionMap(): RedactionMap {
  return {
    placeholderToOriginal: new Map(),
    originalToPlaceholder: new Map(),
    counters: {},
  };
}

/**
 * Generate a unique placeholder for a PII type
 */
function generatePlaceholder(piiType: string, map: RedactionMap, template: string): string {
  if (!map.counters[piiType]) {
    map.counters[piiType] = 0;
  }
  map.counters[piiType]++;
  return template.replace('{{n}}', map.counters[piiType].toString());
}

/**
 * Apply redaction to a string using configured rules
 */
export function redactPII(
  content: string,
  rules: Record<string, PIIRule>,
  map: RedactionMap,
  location: PIIAuditEvent['location'] = 'input'
): RedactionResult {
  let result = content;
  let redactionCount = 0;
  const piiTypesFound: string[] = [];
  const auditEvents: PIIAuditEvent[] = [];
  
  for (const [ruleKey, rule] of Object.entries(rules)) {
    if (!rule.enabled) continue;
    
    // Find all matches
    const matches = content.match(rule.pattern) || [];
    const uniqueMatches = [...new Set(matches)];
    
    for (const match of uniqueMatches) {
      // Validate if validator exists
      if (rule.validate && !rule.validate(match)) {
        continue;
      }
      
      // Check if already redacted
      if (map.originalToPlaceholder.has(match)) {
        const existingPlaceholder = map.originalToPlaceholder.get(match)!;
        result = result.split(match).join(existingPlaceholder);
        continue;
      }
      
      let replacement: string;
      
      if (rule.strategy === 'mask' && rule.maskFn) {
        // Mask strategy: partially hide the value
        replacement = rule.maskFn(match);
      } else {
        // Redact strategy: replace with placeholder
        replacement = generatePlaceholder(ruleKey, map, rule.placeholder);
      }
      
      // Store mapping for potential restoration
      map.originalToPlaceholder.set(match, replacement);
      map.placeholderToOriginal.set(replacement, match);
      
      // Apply redaction
      result = result.split(match).join(replacement);
      redactionCount++;
      
      if (!piiTypesFound.includes(rule.name)) {
        piiTypesFound.push(rule.name);
      }
      
      // Create audit event
      auditEvents.push({
        timestamp: new Date(),
        type: 'redaction',
        piiType: rule.name,
        location,
        originalLength: match.length,
        redactedValue: replacement,
      });
    }
  }
  
  return {
    content: result,
    redactionCount,
    piiTypesFound,
    auditEvents,
  };
}

/**
 * Restore original values from placeholders
 */
export function restorePII(
  content: string,
  map: RedactionMap,
  location: PIIAuditEvent['location'] = 'tool_input'
): RedactionResult {
  let result = content;
  let restorationCount = 0;
  const piiTypesRestored: string[] = [];
  const auditEvents: PIIAuditEvent[] = [];
  
  for (const [placeholder, original] of map.placeholderToOriginal) {
    if (result.includes(placeholder)) {
      result = result.split(placeholder).join(original);
      restorationCount++;
      
      auditEvents.push({
        timestamp: new Date(),
        type: 'restoration',
        piiType: placeholder.replace(/\[|\]|_REDACTED_\d+/g, ''),
        location,
        redactedValue: placeholder,
      });
    }
  }
  
  return {
    content: result,
    redactionCount: restorationCount,
    piiTypesFound: piiTypesRestored,
    auditEvents,
  };
}

// ============================================================================
// MESSAGE REDACTION
// ============================================================================

/**
 * Redact PII from a single message
 */
export function redactMessage(
  message: BaseMessage,
  rules: Record<string, PIIRule>,
  map: RedactionMap,
  location: PIIAuditEvent['location'] = 'input'
): { message: BaseMessage; result: RedactionResult } {
  const content = typeof message.content === 'string' 
    ? message.content 
    : JSON.stringify(message.content);
  
  const result = redactPII(content, rules, map, location);
  
  // Create new message with redacted content
  let redactedMessage: BaseMessage;
  
  if (message instanceof HumanMessage) {
    redactedMessage = new HumanMessage({
      content: result.content,
      ...((message as any).additional_kwargs && { additional_kwargs: (message as any).additional_kwargs }),
    });
  } else if (message instanceof AIMessage) {
    redactedMessage = new AIMessage({
      content: result.content,
      ...((message as any).additional_kwargs && { additional_kwargs: (message as any).additional_kwargs }),
      ...((message as any).tool_calls && { tool_calls: (message as any).tool_calls }),
    });
  } else if (message instanceof SystemMessage) {
    redactedMessage = new SystemMessage({
      content: result.content,
    });
  } else {
    redactedMessage = message;
  }
  
  return { message: redactedMessage, result };
}

/**
 * Redact PII from an array of messages
 */
export function redactMessages(
  messages: BaseMessage[],
  rules: Record<string, PIIRule>,
  map: RedactionMap,
  location: PIIAuditEvent['location'] = 'input'
): { messages: BaseMessage[]; totalRedactions: number; auditEvents: PIIAuditEvent[] } {
  const redactedMessages: BaseMessage[] = [];
  let totalRedactions = 0;
  const allAuditEvents: PIIAuditEvent[] = [];
  
  for (const message of messages) {
    const { message: redactedMessage, result } = redactMessage(message, rules, map, location);
    redactedMessages.push(redactedMessage);
    totalRedactions += result.redactionCount;
    allAuditEvents.push(...result.auditEvents);
  }
  
  return {
    messages: redactedMessages,
    totalRedactions,
    auditEvents: allAuditEvents,
  };
}

// ============================================================================
// TOOL INPUT/OUTPUT REDACTION
// ============================================================================

/**
 * Redact PII from tool input arguments
 */
export function redactToolInput(
  args: Record<string, unknown>,
  rules: Record<string, PIIRule>,
  map: RedactionMap
): { args: Record<string, unknown>; result: RedactionResult } {
  const stringified = JSON.stringify(args);
  const result = redactPII(stringified, rules, map, 'tool_input');
  
  return {
    args: JSON.parse(result.content),
    result,
  };
}

/**
 * Restore PII in tool input arguments (for tools that need original values)
 */
export function restoreToolInput(
  args: Record<string, unknown>,
  map: RedactionMap
): { args: Record<string, unknown>; result: RedactionResult } {
  const stringified = JSON.stringify(args);
  const result = restorePII(stringified, map, 'tool_input');
  
  return {
    args: JSON.parse(result.content),
    result,
  };
}

// ============================================================================
// PII REDACTION MIDDLEWARE CLASS
// ============================================================================

/**
 * PII Redaction Middleware
 * 
 * Manages PII redaction across the agent lifecycle
 * 
 * @example
 * ```typescript
 * const piiMiddleware = new PIIRedactionMiddleware({
 *   rules: LATAM_PII_RULES,
 *   applyToInput: true,
 *   applyToOutput: true,
 *   restoreForTools: ['search_companies', 'get_company_details'],
 * });
 * 
 * // In your agent node:
 * const redactedMessages = piiMiddleware.redactMessages(messages);
 * const response = await model.invoke(redactedMessages);
 * ```
 */
export class PIIRedactionMiddleware {
  private config: PIIRedactionConfig;
  private map: RedactionMap;
  private auditLog: PIIAuditEvent[] = [];
  
  constructor(config: Partial<PIIRedactionConfig> = {}) {
    this.config = {
      rules: config.rules || LATAM_PII_RULES,
      applyToInput: config.applyToInput ?? true,
      applyToOutput: config.applyToOutput ?? true,
      applyToToolInputs: config.applyToToolInputs ?? false, // Usually tools need real values
      restoreForTools: config.restoreForTools || [
        'search_companies',
        'get_company_details',
        'lookup_customer_by_ssn',
        'enrich_company_contacts',
      ],
      enableAuditLog: config.enableAuditLog ?? true,
      onAudit: config.onAudit,
    };
    
    this.map = createRedactionMap();
  }
  
  /**
   * Redact PII from messages
   */
  redactMessages(messages: BaseMessage[]): BaseMessage[] {
    if (!this.config.applyToInput) return messages;
    
    const { messages: redacted, auditEvents } = redactMessages(
      messages,
      this.config.rules,
      this.map,
      'input'
    );
    
    this.logAuditEvents(auditEvents);
    return redacted;
  }
  
  /**
   * Redact PII from AI output
   */
  redactOutput(content: string): string {
    if (!this.config.applyToOutput) return content;
    
    const result = redactPII(content, this.config.rules, this.map, 'output');
    this.logAuditEvents(result.auditEvents);
    return result.content;
  }
  
  /**
   * Process tool input - restore or redact based on tool name
   */
  processToolInput(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
    // If this tool needs original values, restore them
    if (this.config.restoreForTools?.includes(toolName)) {
      const { args: restored, result } = restoreToolInput(args, this.map);
      this.logAuditEvents(result.auditEvents);
      return restored;
    }
    
    // Otherwise, apply redaction if configured
    if (this.config.applyToToolInputs) {
      const { args: redacted, result } = redactToolInput(args, this.config.rules, this.map);
      this.logAuditEvents(result.auditEvents);
      return redacted;
    }
    
    return args;
  }
  
  /**
   * Get the current redaction map (for debugging/testing)
   */
  getRedactionMap(): RedactionMap {
    return this.map;
  }
  
  /**
   * Get all audit events
   */
  getAuditLog(): PIIAuditEvent[] {
    return [...this.auditLog];
  }
  
  /**
   * Clear the redaction map (e.g., between conversations)
   */
  reset(): void {
    this.map = createRedactionMap();
    this.auditLog = [];
  }
  
  /**
   * Log audit events
   */
  private logAuditEvents(events: PIIAuditEvent[]): void {
    if (!this.config.enableAuditLog) return;
    
    this.auditLog.push(...events);
    
    // Call custom audit handler if provided
    if (this.config.onAudit) {
      for (const event of events) {
        this.config.onAudit(event);
      }
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development' && events.length > 0) {
      console.log(
        `[PIIRedaction] ${events.length} ${events[0].type}(s):`,
        events.map(e => `${e.piiType} in ${e.location}`).join(', ')
      );
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  PIIRedactionMiddleware,
  LATAM_PII_RULES,
  redactPII,
  restorePII,
  redactMessages,
  redactMessage,
  redactToolInput,
  restoreToolInput,
  createRedactionMap,
};

