import { NextResponse } from 'next/server';

let systemGlobalConfig = {
  platformName: 'InventorySync Enterprise Master',
  maintenanceMode: false,
  globalRevenueShareDefault: '25%',
  activeNodes: [
    { name: 'AWS Frankfurt eu-central-1 (Primary)', status: 'OPERATIONAL', latency: '14ms', load: '18%' },
    { name: 'Hetzner Nuremberg Storage Cluster', status: 'OPERATIONAL', latency: '19ms', load: '12%' },
    { name: 'US-East Cloudflare Edge Relay', status: 'OPERATIONAL', latency: '8ms', load: '9%' }
  ],
  securitySettings: {
    twoFactorEnforced: true,
    ipRateLimiting: true,
    webhookSignatureValidation: true,
    sessionTimeoutMinutes: 120
  },
  channelHealth: {
    shopify: { status: 'OPTIMAL', apiRateLimitRemaining: '98%' },
    amazonEu: { status: 'OPTIMAL', apiRateLimitRemaining: '95%' },
    ebayDe: { status: 'OPTIMAL', apiRateLimitRemaining: '99%' },
    kaufland: { status: 'OPTIMAL', apiRateLimitRemaining: '100%' }
  }
};

export async function GET() {
  return NextResponse.json(systemGlobalConfig);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    systemGlobalConfig = { ...systemGlobalConfig, ...body };
    return NextResponse.json({ success: true, config: systemGlobalConfig });
  } catch (err) {
    return NextResponse.json({ detail: 'Error al actualizar configuración' }, { status: 500 });
  }
}
