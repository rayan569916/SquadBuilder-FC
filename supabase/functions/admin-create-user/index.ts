import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    return Response.json({ error: 'Only admins can create accounts.' }, { status: 403, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim();
    const password = String(body.password || '');
    const role = body.role;
    const position = body.position;
    const attributes = body.attributes;
    const attributeKeys = ['impact', 'shooting', 'passing', 'defense', 'physical'] as const;
    const hasValidAttributes = attributes && attributeKeys.every((key) =>
      typeof attributes[key] === 'number' && Number.isInteger(attributes[key]) && attributes[key] >= 0 && attributes[key] <= 100,
    );

    if (!email || !name || password.length < 10) {
      return Response.json({ error: 'Name, email, and a password of at least 10 characters are required.' }, { status: 400, headers: corsHeaders });
    }
    if (!['player', 'manager', 'admin'].includes(role)) {
      return Response.json({ error: 'Invalid account role.' }, { status: 400, headers: corsHeaders });
    }
    if (!['GK', 'DF', 'MF', 'FW'].includes(position)) {
      return Response.json({ error: 'Invalid player position.' }, { status: 400, headers: corsHeaders });
    }
    if (!hasValidAttributes) {
      return Response.json({ error: 'Enter whole-number player ratings from 0 to 100.' }, { status: 400, headers: corsHeaders });
    }
    const overallRating = Math.round(attributeKeys.reduce((total, key) => total + attributes[key], 0) / attributeKeys.length);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError || !created.user) {
      return Response.json({ error: createError?.message || 'Account creation failed.' }, { status: 400, headers: corsHeaders });
    }

    const { data: profile, error: insertError } = await adminClient
      .from('profiles')
      .insert({
        id: created.user.id,
        email,
        name,
        role,
        position,
        age: Number(body.age) || 24,
        overall_rating: overallRating,
        attributes,
      })
      .select('*')
      .single();

    if (insertError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return Response.json({ error: insertError.message }, { status: 400, headers: corsHeaders });
    }

    return Response.json({ profile }, { status: 201, headers: corsHeaders });
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400, headers: corsHeaders });
  }
});
