import {
  calculatePrintPrice,
  calculatePrintQuote,
  PriceCalculationInput,
  PriceCalculationResult,
  PriceQuoteInput,
  PriceQuote,
  QuoteCalculationContext
} from '@s2p/shared';

export function calculateAuthoritativePrice(input: PriceCalculationInput): PriceCalculationResult {
  return calculatePrintPrice(input);
}

export function calculateAuthoritativeQuote(
  input: PriceQuoteInput,
  context: QuoteCalculationContext
): PriceQuote {
  return calculatePrintQuote(input, context);
}
