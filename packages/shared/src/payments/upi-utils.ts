import * as crypto from 'crypto';
// @ts-ignore
import QRCode from 'qrcode';

export interface UpiPaymentUriParams {
  upiId: string;
  payeeName: string;
  amountRupees: number | string;
  orderToken?: string;
  reference?: string;
}

export interface ParsedUpiUri {
  upiId: string;
  payeeName: string;
  amountRupees: string;
  currency: string;
  note: string;
  reference: string;
}

export class UpiPaymentUtils {
  /**
   * Formats integer paise to exact INR string with 2 decimal places (e.g. 1200 paise -> "12.00")
   */
  public static formatPaiseToRupees(paise: number): string {
    const safePaise = Math.max(0, Math.round(paise || 0));
    return (safePaise / 100).toFixed(2);
  }

  /**
   * Generates a unique manual UPI payment reference
   * Format: S2P-UPI-<orderToken>-<shortRandom>
   */
  public static generateManualPaymentReference(orderToken: string): string {
    const cleanToken = (orderToken || 'ORD').replace(/[^A-Za-z0-9]/g, '').slice(-8);
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `S2P-UPI-${cleanToken}-${suffix}`;
  }

  /**
   * Generates a standard RFC-compliant UPI payment intent URI
   * Example: upi://pay?pa=shop%40upi&pn=Shakeel&am=12.00&cu=INR&tn=S2P%20Order%201001&tr=S2P-UPI-1001-A1B2
   */
  public static generateUpiPaymentUri(params: UpiPaymentUriParams): string {
    if (!params.upiId || !params.upiId.includes('@')) {
      throw new Error('INVALID_UPI_ID: A valid UPI ID containing "@" is required.');
    }
    if (!params.payeeName) {
      throw new Error('INVALID_PAYEE_NAME: Payee name is required.');
    }

    const numAmount = typeof params.amountRupees === 'string' ? parseFloat(params.amountRupees) : params.amountRupees;
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('INVALID_AMOUNT: Amount must be a positive number.');
    }
    const formattedAmount = numAmount.toFixed(2);

    const ref = params.reference || this.generateManualPaymentReference(params.orderToken || 'ORDER');
    const note = `S2P Order ${params.orderToken || ''}`.trim();

    const query = new URLSearchParams();
    query.set('pa', params.upiId.trim());
    query.set('pn', params.payeeName.trim());
    query.set('am', formattedAmount);
    query.set('cu', 'INR');
    query.set('tn', note);
    query.set('tr', ref);

    return `upi://pay?${query.toString()}`;
  }

  /**
   * Parses and validates a UPI payment URI
   */
  public static parseUpiPaymentUri(uri: string): ParsedUpiUri {
    if (!uri.startsWith('upi://pay?')) {
      throw new Error('INVALID_UPI_URI: Scheme must begin with upi://pay?');
    }

    const queryStr = uri.slice('upi://pay?'.length);
    const params = new URLSearchParams(queryStr);

    const upiId = params.get('pa');
    const payeeName = params.get('pn');
    const amountRupees = params.get('am');
    const currency = params.get('cu');
    const note = params.get('tn') || '';
    const reference = params.get('tr') || '';

    if (!upiId || !payeeName || !amountRupees || !currency) {
      throw new Error('MALFORMED_UPI_URI: Missing mandatory UPI query parameters (pa, pn, am, cu).');
    }

    return {
      upiId,
      payeeName,
      amountRupees,
      currency,
      note,
      reference
    };
  }

  /**
   * Generates a deterministic SVG QR code string for the UPI URI
   */
  public static async generateUpiQrSvg(uri: string): Promise<string> {
    return await QRCode.toString(uri, {
      type: 'svg',
      margin: 2,
      errorCorrectionLevel: 'M'
    });
  }

  /**
   * Generates a deterministic base64 Data URL for the UPI URI
   */
  public static async generateUpiQrDataUrl(uri: string): Promise<string> {
    return await QRCode.toDataURL(uri, {
      margin: 2,
      errorCorrectionLevel: 'M',
      width: 320
    });
  }
}
