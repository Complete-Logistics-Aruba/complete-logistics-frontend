import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendReceivingEmail } from './email';

// Mock fetch
globalThis.fetch = vi.fn();

describe('Email Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should compose email body correctly', async () => {
    const consoleSpy = vi.spyOn(console, 'log');

    const emailData = {
      receivingOrderId: 'order-123',
      containerNum: 'CONT-001',
      sealNum: 'SEAL-001',
      items: [
        { itemId: 'ITEM-1', description: 'Widget A', receivedQty: 100 },
        { itemId: 'ITEM-2', description: 'Widget B', receivedQty: 50 },
      ],
      formUrl: 'https://example.com/form.pdf',
    };

    await sendReceivingEmail(emailData);

    // Check that email body was logged
    const logCalls = consoleSpy.mock.calls.map((call) => call[0]?.toString() || '');
    const emailBodyLog = logCalls.find((log) => log.includes('Email body'));
    
    expect(emailBodyLog).toBeDefined();
    expect(emailBodyLog).toContain('CONT-001');
    expect(emailBodyLog).toContain('ITEM-1');
    expect(emailBodyLog).toContain('100 units');

    consoleSpy.mockRestore();
  });

  it('should log email details', async () => {
    const consoleSpy = vi.spyOn(console, 'log');

    const emailData = {
      receivingOrderId: 'order-123',
      containerNum: 'CONT-001',
      sealNum: 'SEAL-001',
      items: [{ itemId: 'ITEM-1', description: 'Widget A', receivedQty: 100 }],
      formUrl: 'https://example.com/form.pdf',
    };

    await sendReceivingEmail(emailData);

    const logCalls = consoleSpy.mock.calls.map((call) => call[0]?.toString() || '');
    expect(logCalls.some((log) => log.includes('Success'))).toBe(true);
    expect(logCalls.some((log) => log.includes('receiving@example.com'))).toBe(true);

    consoleSpy.mockRestore();
  });

  it('should include form attachment in email body', async () => {
    const consoleSpy = vi.spyOn(console, 'log');

    const formUrl = 'https://example.com/receiving-form.pdf';
    const emailData = {
      receivingOrderId: 'order-123',
      containerNum: 'CONT-001',
      sealNum: 'SEAL-001',
      items: [{ itemId: 'ITEM-1', description: 'Widget A', receivedQty: 100 }],
      formUrl,
    };

    await sendReceivingEmail(emailData);

    const logCalls = consoleSpy.mock.calls.map((call) => call[0]?.toString() || '');
    const attachmentLog = logCalls.find((log) => log.includes('Form attachment'));
    
    expect(attachmentLog).toBeDefined();
    expect(attachmentLog).toContain(formUrl);

    consoleSpy.mockRestore();
  });

  it('should send to configured email recipient', async () => {
    const consoleSpy = vi.spyOn(console, 'log');

    const emailData = {
      receivingOrderId: 'order-123',
      containerNum: 'CONT-001',
      sealNum: 'SEAL-001',
      items: [{ itemId: 'ITEM-1', description: 'Widget A', receivedQty: 100 }],
      formUrl: 'https://example.com/form.pdf',
    };

    await sendReceivingEmail(emailData);

    const logCalls = consoleSpy.mock.calls.map((call) => call[0]?.toString() || '');
    const recipientLog = logCalls.find((log) => log.includes('receiving@example.com'));
    
    expect(recipientLog).toBeDefined();

    consoleSpy.mockRestore();
  });
});
