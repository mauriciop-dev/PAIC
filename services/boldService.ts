import { apiService } from './apiService';

interface BoldWebhookPayload {
    event: string;
    data: Record<string, unknown>;
}

export const boldService = {
    async processWebhook(payload: BoldWebhookPayload): Promise<void> {
        console.log('Bold webhook received:', payload.event);
    },

    async linkBankAccount(conjuntoId: number, accountData: { bank: string; accountType: string; accountNumber: string }): Promise<void> {
        console.log('Linking bank account for conjunto:', conjuntoId, accountData);
    },

    async triggerPayout(conjuntoId: number, amount: number): Promise<void> {
        console.log('Triggering payout for conjunto:', conjuntoId, 'amount:', amount);
    },
};
