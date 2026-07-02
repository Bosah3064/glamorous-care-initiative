import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    // Check Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase Client using the SERVICE_ROLE_KEY to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user making the request is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized or invalid token.')
    }

    // Check if user has an admin role in the members table
    const { data: adminMember } = await supabase
      .from('members')
      .select('role')
      .eq('id', user.id)
      .single()

    const adminRoles = ['admin', 'treasury', 'chairperson', 'vice_chairperson']
    if (!adminMember || !adminRoles.includes(adminMember.role)) {
      throw new Error('Forbidden: You do not have permission to import members.')
    }

    // Parse request body
    const { members } = await req.json()
    
    if (!members || !Array.isArray(members)) {
      throw new Error('Invalid payload. Expected an array of members.')
    }

    let importedCount = 0
    let errors = []

    for (const member of members) {
      try {
        const email = member.email.trim().toLowerCase()
        const fullName = member.full_name || 'Imported Member'
        const phone = member.phone || ''

        // 1. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: email,
          password: '12345678', // Default password
          email_confirm: true,
          user_metadata: { full_name: fullName }
        })

        if (authError) {
          throw new Error(`Failed to create auth user for ${email}: ${authError.message}`)
        }

        const userId = authData.user.id

        // 2. Insert into members table with form_details
        const { error: dbError } = await supabase.from('members').insert({
          id: userId,
          full_name: fullName,
          email: email,
          phone: phone,
          role: 'member',
          status: 'active',
          requires_password_reset: true, // Force them to change 12345678
          form_details: member.form_details || {}
        })

        if (dbError) {
          throw new Error(`Failed to insert into members table for ${email}: ${dbError.message}`)
        }

        // 3. Insert payments if any exist
        if (member.payments && Array.isArray(member.payments)) {
          for (const payment of member.payments) {
            const { error: paymentError } = await supabase.from('payments').insert({
              member_id: userId,
              member_name: fullName,
              amount: payment.amount,
              month: payment.month,
              payment_date: new Date().toISOString().split('T')[0], // Use today's date
              status: payment.status || 'paid',
              reference: 'Excel Bulk Import'
            })
            if (paymentError) {
              console.error(`Failed to insert payment for ${email}:`, paymentError.message)
            }
          }
        }

        importedCount++
      } catch (err: any) {
        errors.push(err.message)
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      importedCount, 
      errors: errors.length > 0 ? errors : undefined 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
