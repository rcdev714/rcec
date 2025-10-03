import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse the multipart form data
    const formData = await request.formData();
    const jobId = formData.get('jobId') as string;
    const firstName = formData.get('first_name') as string;
    const lastName = formData.get('last_name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string | null;
    const linkedinUrl = formData.get('linkedin_url') as string | null;
    const message = formData.get('message') as string;
    const cvFile = formData.get('cv') as File | null;

    // Validate required fields
    if (!jobId || !firstName || !lastName || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if job exists and is active
    const { data: job, error: jobError } = await supabase
      .from('job_positions')
      .select('id, title')
      .eq('id', jobId)
      .eq('is_active', true)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job position not found or inactive' },
        { status: 404 }
      );
    }

    let cvUrl = null;
    let cvFileName = null;

    // Handle CV file upload if provided
    if (cvFile) {
      // Validate file type
      if (cvFile.type !== 'application/pdf') {
        return NextResponse.json(
          { error: 'CV must be a PDF file' },
          { status: 400 }
        );
      }

      // Validate file size (5MB limit)
      if (cvFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'CV file size must be less than 5MB' },
          { status: 400 }
        );
      }

      // Generate unique filename
      const fileExtension = cvFile.name.split('.').pop();
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('job-applications')
        .upload(uniqueFileName, cvFile, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading CV:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload CV file' },
          { status: 500 }
        );
      }

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('job-applications')
        .getPublicUrl(uniqueFileName);

      cvUrl = publicUrl;
      cvFileName = cvFile.name;
    }

    // Check if user has already applied for this position
    const { data: existingApplication, error: checkError } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_position_id', jobId)
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing application:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing applications' },
        { status: 500 }
      );
    }

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied for this position' },
        { status: 409 }
      );
    }

    // Insert the job application
    const { data: application, error: insertError } = await supabase
      .from('job_applications')
      .insert({
        job_position_id: jobId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        linkedin_url: linkedinUrl,
        cover_letter: message,
        cv_file_url: cvUrl,
        cv_file_name: cvFileName,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting job application:', insertError);

      // Clean up uploaded file if insertion failed
      if (cvUrl) {
        const fileName = cvUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('job-applications')
            .remove([fileName]);
        }
      }

      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Application submitted successfully',
      application: {
        id: application.id,
        email: application.email,
        status: application.status,
        created_at: application.created_at
      }
    });

  } catch (error) {
    console.error('Error in job application API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
