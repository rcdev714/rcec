import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';


export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: offerings, error } = await supabase
      .from('user_offerings')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching user offerings:', error);
      return NextResponse.json({ error: 'Failed to fetch offerings' }, { status: 500 });
    }

    return NextResponse.json(offerings, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate incoming data (basic validation for now)
    const { offering_name, description, industry, price_plans, industry_targets, website_url, social_media_links, documentation_urls, target_company_rucs } = body;

    if (!offering_name) {
      return NextResponse.json({ error: 'Offering name is required' }, { status: 400 });
    }

    // Insert into user_offerings table
    const { data: newOffering, error: offeringError } = await supabase
      .from('user_offerings')
      .insert({
        user_id: user.id,
        offering_name,
        description,
        industry,
        price_plans,
        industry_targets: industry_targets || [],
        website_url,
        social_media_links,
        documentation_urls,
      })
      .select()
      .single();

    if (offeringError) {
      console.error('Error inserting user offering:', offeringError);
      return NextResponse.json({ error: 'Failed to create offering' }, { status: 500 });
    }

    // Handle many-to-many relationship with companies
    if (target_company_rucs && target_company_rucs.length > 0) {
      const companyTargetInserts = [];
      for (const ruc of target_company_rucs) {
        // First, get the company_id from the companies table using the RUC
        const { data: companyData, error: companyLookupError } = await supabase
          .from('companies')
          .select('id')
          .eq('ruc', ruc)
          .single();

        if (companyLookupError || !companyData) {
          console.warn(`Company with RUC ${ruc} not found or error:`, companyLookupError?.message || 'No data');
          // Optionally, decide whether to return an error or continue without this target
          continue; // Skip this target if company not found
        }

        companyTargetInserts.push({
          offering_id: newOffering.id,
          company_id: companyData.id,
        });
      }

      if (companyTargetInserts.length > 0) {
        const { error: targetsError } = await supabase
          .from('offering_company_targets')
          .insert(companyTargetInserts);

        if (targetsError) {
          console.error('Error inserting offering company targets:', targetsError);
          // Decide how to handle this error: rollback the offering or just log
          // For now, we'll return a partial success or specific error.
          return NextResponse.json({ error: 'Offering created, but failed to link to some companies', details: targetsError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ message: 'Offering created successfully', offering: newOffering }, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
