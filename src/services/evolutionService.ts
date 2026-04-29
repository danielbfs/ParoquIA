
export interface EvolutionInstance {
  instanceName: string;
  status: string;
  qrcode?: string;
}

export const evolutionService = {
  async getStatus(apiUrl: string, apiKey: string) {
    try {
      const response = await fetch(`${apiUrl}/api/evolution/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Evolution API Status Error:', error);
      return false;
    }
  },

  async createInstance(apiUrl: string, apiKey: string, instanceName: string) {
    const response = await fetch(`${apiUrl}/api/evolution/instance/create`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instanceName: instanceName,
        token: '', // Optional, generic token
        qrcode: true,
        number: '',
        integration: 'WHATSAPP-BAILEYS'
      })
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Erro ao criar instância');
    }
    
    return await response.json();
  },

  async getQrCode(apiUrl: string, apiKey: string, instanceName: string) {
    const response = await fetch(`${apiUrl}/api/evolution/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error('Erro ao obter QR Code');
    }
    
    return await response.json();
  },

  async setWebhook(apiUrl: string, apiKey: string, instanceName: string, webhookUrl: string) {
    const response = await fetch(`${apiUrl}/api/evolution/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        webhook_by_events: false,
        events: [
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "MESSAGES_DELETE",
          "SEND_MESSAGE",
          "CONTACTS_UPSERT",
          "CONTACTS_UPDATE",
          "PRESENCE_UPDATE",
          "CHATS_UPSERT",
          "CHATS_UPDATE",
          "CHATS_DELETE",
          "GROUPS_UPSERT",
          "GROUPS_UPDATE",
          "GROUP_PARTICIPANTS_UPDATE",
          "CONNECTION_UPDATE",
          "CALL"
        ]
      })
    });
    
    if (!response.ok) {
       const err = await response.json();
       throw new Error(err.message || 'Erro ao configurar Webhook');
    }
    
    return await response.json();
  },

  async getInstance(apiUrl: string, apiKey: string, instanceName: string) {
    const response = await fetch(`${apiUrl}/api/evolution/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey
      }
    });
    
    if (!response.ok) return null;
    return await response.json();
  }
};
