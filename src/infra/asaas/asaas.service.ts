import { Injectable, HttpException } from '@nestjs/common';
import axios from 'axios';

type CreateCustomerInput = {
  name: string;
  email: string;
  cpfCnpj?: string;
};

type CreatePaymentInput = {
  customerId: string;
  value: number; // em reais (ex: 299.90)
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  externalReference: string; // orderId
  description?: string;
};

@Injectable()
export class AsaasService {
  private client = axios.create({
    baseURL: process.env.ASAAS_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      access_token: process.env.ASAAS_API_KEY!,
    },
  });

  private handleError(err: any) {
    throw new HttpException(
      err?.response?.data || 'Erro na integração com Asaas',
      err?.response?.status || 500,
    );
  }

  // 1) cria customer (simples e suficiente pro nosso teste)
  async createCustomer(input: CreateCustomerInput) {
    console.log('ASAAS_API_KEY loaded:', (process.env.ASAAS_API_KEY || '').slice(0, 10)); 
    try {
      const res = await this.client.post('/customers', {
        name: input.name,
        email: input.email,
        cpfCnpj: input.cpfCnpj,
      });
      return res.data; // tem .id
    } catch (err: any) {
      this.handleError(err);
    }
  }

  // 2) cria payment
  async createPayment(input: CreatePaymentInput) {
    try {
      const res = await this.client.post('/payments', {
        customer: input.customerId,
        billingType: input.billingType,
        value: input.value,
        externalReference: input.externalReference,
        description: input.description,
      });
      return res.data; // tem .id e .invoiceUrl
    } catch (err: any) {
      this.handleError(err);
    }
  }

  // 3) pega QR Code do PIX (Asaas)
  async getPixQrCode(paymentId: string) {
    try {
      const res = await this.client.get(`/payments/${paymentId}/pixQrCode`);
      return res.data; // qrCode + payload (copia e cola) etc.
    } catch (err: any) {
      this.handleError(err);
    }
  }
}
