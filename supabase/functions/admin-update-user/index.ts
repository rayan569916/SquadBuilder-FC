import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const attributeKeys = ['impact', 'shooting', 'passing', 'defense', 'physical'] as const;

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return Response.json({ error: 'Server auth configuration is incomplete.' }, { status: 500, headers: corsHeaders });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user: caller }, error: authError } = await userClient.auth.getUser();

  if (authError || !caller) {
    return Response.json({ error: 'Authentication required.' }, { status: 401, headers: corsHeaders });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (profileError || callerProfile?.role !== 'admin') {
    return Response.json({ error: 'Only admins can update accounts.' }, { status: 403, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const profileId = String(body.profile_id || '');
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const role = body.role;
    const position = body.position;
    const attributes = body.attributes;

    if (!profileId || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'A profile, name, and valid username/email are required.' }, { status: 400, headers: corsHeaders });
    }
    if (password && password.length < 10) {
      return Response.json({ error: 'A new password must be at least 10 characters.' }, { status: 400, headers: corsHeaders });
    }
    if (!['player', 'manager', 'admin'].includes(role)) {
      return Response.json({ error: 'Invalid account role.' }, { status: 400, headers: corsHeaders });
    }
    if (!['GK', 'DF', 'MF', 'FW'].includes(position)) {
      return Response.json({ error: 'Invalid player position.' }, { status: 400, headers: corsHeaders });
    }
    if (!attributes || !attributeKeys.every((key) =>
      typeof attributes[key] === 'number' && Number.isInteger(attributes[key]) && attributes[key] >= 0 && attributes[key] <= 100,
    )) {
      return Response.json({ error: 'All five player ratings must be whole numbers from 0 to 100.' }, { status: 400, headers: corsHeaders });
    }
    if (profileId === caller.id && role !== 'admin') {
      return Response.json({ error: 'You cannot remove your own admin role.' }, { status: 400, headers: corsHeaders });
    }

    const { data: existingProfile, error: existingError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();
    if (existingError || !existingProfile) {
      return Response.json({ error: 'Profile not found.' }, { status: 404, headers: corsHeaders });
    }

    const overallRating = Math.round(attributeKeys.reduce((total, key) => total + attributes[key], 0) / attributeKeys.length);
    const updates = {
      name,
      email,
      role,
      position,
      attributes,
      overall_rating: overallRating,
    };
    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', profileId);
    if (profileUpdateError) {
      return Response.json({ error: profileUpdateError.message }, { status: 400, headers: corsHeaders });
    }

    const authUpdates: { email: string; email_confirm: boolean; user_metadata: { name: string }; password?: string } = {
      email,
      email_confirm: true,
      user_metadata: { name },
    };
    if (password) authUpdates.password = password;
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(profileId, authUpdates);
    if (authUpdateError) {
      const { error: rollbackError } = await adminClient
        .from('profiles')
        .update({
          name: existingProfile.name,
          email: existingProfile.email,
          role: existingProfile.role,
          position: existingProfile.position,
          attributes: existingProfile.attributes,
          overall_rating: existingProfile.overall_rating,
        })
        .eq('id', profileId);
      const message = rollbackError
        ? `${authUpdateError.message} Profile rollback also failed: ${rollbackError.message}`
        : authUpdateError.message;
      return Response.json({ error: message }, { status: 400, headers: corsHeaders });
    }

    const { data: updatedProfile, error: readError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();
    if (readError) {
      return Response.json({ error: readError.message }, { status: 400, headers: corsHeaders });
    }

    return Response.json({ profile: updatedProfile }, { status: 200, headers: corsHeaders });
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400, headers: corsHeaders });
  }
});