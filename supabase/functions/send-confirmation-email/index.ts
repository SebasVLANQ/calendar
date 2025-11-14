import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface EmailRequest {
  event: {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    duration: number;
    difficulty: string;
    seats_available: number;
    event_start_location?: string;
  };
  user: {
    email: string;
    full_name: string;
  };
  seats_requested: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { event, user, seats_requested }: EmailRequest = await req.json();

    // Validate required fields
    if (!event || !user || !user.email || !user.full_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format dates for email
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    // Create email content
    const emailSubject = `Event Registration Confirmation - ${event.title}`;
    
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Registration Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
        .detail-row { margin: 10px 0; }
        .label { font-weight: bold; color: #4b5563; }
        .value { color: #1f2937; }
        .difficulty { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .difficulty-beginner { background: #dcfce7; color: #166534; }
        .difficulty-intermediate { background: #fef3c7; color: #92400e; }
        .difficulty-advanced { background: #fecaca; color: #991b1b; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        .location { background: #eff6ff; padding: 15px; border-radius: 6px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Registration Confirmed!</h1>
        <p>Thank you for registering for our event</p>
    </div>
    
    <div class="content">
        <p>Dear ${user.full_name},</p>
        
        <p>We're excited to confirm your registration for the following event:</p>
        
        <div class="event-details">
            <h2 style="margin-top: 0; color: #2563eb;">${event.title}</h2>
            
            <div class="detail-row">
                <span class="label">📅 Date:</span>
                <span class="value">${formatDate(startDate)}</span>
            </div>
            
            <div class="detail-row">
                <span class="label">🕐 Time:</span>
                <span class="value">${formatTime(startDate)} - ${formatTime(endDate)}</span>
            </div>
            
            <div class="detail-row">
                <span class="label">⏱️ Duration:</span>
                <span class="value">${Math.floor(event.duration / 60)}h ${event.duration % 60}m</span>
            </div>
            
            <div class="detail-row">
                <span class="label">🎯 Difficulty:</span>
                <span class="difficulty difficulty-${event.difficulty.toLowerCase()}">${event.difficulty}</span>
            </div>
            
            <div class="detail-row">
                <span class="label">🎫 Seats Reserved:</span>
                <span class="value">${seats_requested} seat${seats_requested > 1 ? 's' : ''}</span>
            </div>
            
            ${event.event_start_location ? `
            <div class="location">
                <div class="detail-row">
                    <span class="label">📍 Event Location:</span>
                </div>
                <div style="margin-top: 8px; word-break: break-all; color: #4b5563;">
                    ${event.event_start_location}
                </div>
            </div>
            ` : ''}
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <h3 style="color: #2563eb; margin-bottom: 10px;">Event Description:</h3>
                <p style="color: #4b5563; line-height: 1.6;">${event.description}</p>
            </div>
        </div>
        
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
            <h3 style="color: #065f46; margin-top: 0;">What's Next?</h3>
            <ul style="color: #047857; margin: 0; padding-left: 20px;">
                <li>Save this email for your records</li>
                <li>Mark your calendar for ${formatDate(startDate)}</li>
                <li>Arrive a few minutes early to check in</li>
                ${event.event_start_location ? '<li>Use the location link above to find the venue</li>' : ''}
            </ul>
        </div>
        
        <p>If you have any questions or need to make changes to your registration, please contact our support team.</p>
        
        <p>We look forward to seeing you at the event!</p>
        
        <p>Best regards,<br>
        <strong>Expediciones Angostura Team</strong></p>
    </div>
    
    <div class="footer">
        <p>This is an automated confirmation email. Please do not reply to this message.</p>
        <p>© ${new Date().getFullYear()} Expediciones Angostura. All rights reserved.</p>
    </div>
</body>
</html>
    `.trim();

    // For demonstration purposes, we'll use Resend as the email service
    // You'll need to set up a Resend account and add your API key to Supabase secrets
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@expedicionesangostura.com';

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: "Email service not configured",
          message: "Email confirmation could not be sent, but your registration is confirmed."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send email using Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [user.email],
        subject: emailSubject,
        html: emailBody,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Failed to send email:', errorData);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to send confirmation email",
          message: "Your registration is confirmed, but the confirmation email could not be sent.",
          details: errorData
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Confirmation email sent successfully",
        email_id: emailResult.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Error in send-confirmation-email function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: "Your registration is confirmed, but there was an issue sending the confirmation email.",
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});