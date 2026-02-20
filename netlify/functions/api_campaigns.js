import { listCampaigns, createCampaign, updateCampaign, deleteCampaign, getContextDefaults } from '../../shared/storage.js';

function response(body, statusCode = 200) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

export async function handler(event) {
  try {
    const defaults = getContextDefaults();
    if (event.httpMethod === 'GET') {
      const campaigns = await listCampaigns({ org_id: defaults.org_id });
      return response(campaigns);
    }

    const payload = event.body ? JSON.parse(event.body) : {};

    if (event.httpMethod === 'POST') {
      if (!payload.name) {
        return response({ error: 'name is required' }, 400);
      }
      const created = await createCampaign({ name: payload.name, color: payload.color || null, meta: payload.meta || null }, { org_id: defaults.org_id });
      return response(created, 201);
    }

    if (event.httpMethod === 'PUT') {
      const id = payload.id || (event.queryStringParameters && event.queryStringParameters.id);
      if (!id) return response({ error: 'id is required' }, 400);
      const updated = await updateCampaign(id, { name: payload.name, color: payload.color, meta: payload.meta }, { org_id: defaults.org_id });
      return response(updated || { error: 'not found' }, updated ? 200 : 404);
    }

    if (event.httpMethod === 'DELETE') {
      const id = payload.id || (event.queryStringParameters && event.queryStringParameters.id);
      if (!id) return response({ error: 'id is required' }, 400);
      await deleteCampaign(id, { org_id: defaults.org_id });
      return response({ ok: true });
    }

    return response({ error: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('api_campaigns error', error);
    return response({ error: error.message || 'Internal Server Error' }, 500);
  }
}
