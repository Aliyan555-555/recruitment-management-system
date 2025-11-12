/**
 * Email notification service using Nodemailer
 * Configure SMTP settings in .env file
 */

import nodemailer from 'nodemailer'

// Create transporter
const createTransporter = () => {
  // For development, use console logging if no SMTP config
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    return null
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

/**
 * Send an email using Nodemailer
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter()

    // In development without SMTP, just log
    if (!transporter) {
      console.log('📧 Email would be sent:', {
        to: options.to,
        subject: options.subject,
        html: options.html.substring(0, 100) + '...'
      })
      return { success: true }
    }

    const mailOptions = {
      from: options.from || process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email sent:', info.messageId)
    return { success: true }
  } catch (error: any) {
    console.error('❌ Email send error:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

/**
 * Send application confirmation email to candidate
 */
export async function sendApplicationConfirmationEmail(
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  jobCompany: string,
  applicationId: string
): Promise<void> {
  const subject = `Application Submitted Successfully - ${jobTitle}`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981; }
        .info-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Application Submitted</h1>
        </div>
        <div class="content">
          <p>Hello ${candidateName},</p>
          <p>Thank you for your interest! We have successfully received your application.</p>
          
          <div class="success-box">
            <h3>Application Details</h3>
            <p><strong>Job Title:</strong> ${jobTitle}</p>
            <p><strong>Company:</strong> ${jobCompany}</p>
            <p><strong>Application ID:</strong> ${applicationId}</p>
            <p><strong>Status:</strong> Submitted</p>
          </div>

          <div class="info-box">
            <h3>What's Next?</h3>
            <p>Our recruitment team will review your application and get back to you soon. You will receive email notifications about the status of your application.</p>
            <p>You can also check your application status by logging into your account.</p>
          </div>

          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification from the Recruitment Management System.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: candidateEmail,
    subject,
    html
  })
}

/**
 * Send notification email to interviewer about new assignment
 */
export async function sendInterviewerAssignmentEmail(
  interviewerEmail: string,
  interviewerName: string,
  candidateName: string,
  stepName: string,
  jobTitle: string,
  jobCompany: string
): Promise<void> {
  const subject = `New Interview Assignment: ${stepName} - ${jobTitle}`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .info-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Interview Assignment</h1>
        </div>
        <div class="content">
          <p>Hello ${interviewerName},</p>
          <p>You have been assigned to conduct an interview for a new candidate.</p>
          
          <div class="info-box">
            <h3>Interview Details</h3>
            <p><strong>Candidate:</strong> ${candidateName}</p>
            <p><strong>Step:</strong> ${stepName}</p>
            <p><strong>Job:</strong> ${jobTitle}</p>
            <p><strong>Company:</strong> ${jobCompany}</p>
          </div>

          <p>Please log in to the recruitment system to review the candidate's profile and schedule the interview.</p>
          
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/interviewer/assignments" class="button">View Assignment</a>
          
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification from the Recruitment Management System.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: interviewerEmail,
    subject,
    html
  })
}

/**
 * Send notification email to candidate about step completion
 */
export async function sendCandidateStepCompletionEmail(
  candidateEmail: string,
  candidateName: string,
  stepName: string,
  jobTitle: string,
  nextStepName?: string
): Promise<void> {
  const subject = nextStepName 
    ? `Congratulations! You've completed ${stepName} - ${jobTitle}`
    : `Application Update: ${stepName} - ${jobTitle}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Step Completed!</h1>
        </div>
        <div class="content">
          <p>Hello ${candidateName},</p>
          <p>Great news! You have successfully completed the <strong>${stepName}</strong> step for the position <strong>${jobTitle}</strong>.</p>
          
          ${nextStepName ? `
          <div class="success-box">
            <h3>Next Step</h3>
            <p>You've been advanced to the next step: <strong>${nextStepName}</strong></p>
            <p>You will be notified when an interviewer is assigned and ready to schedule your interview.</p>
          </div>
          ` : `
          <div class="success-box">
            <h3>What's Next?</h3>
            <p>Our team will review your application and get back to you soon. Thank you for your patience!</p>
          </div>
          `}

          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification from the Recruitment Management System.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: candidateEmail,
    subject,
    html
  })
}

/**
 * Send notification email to candidate about rejection
 */
export async function sendCandidateRejectionEmail(
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  stepName?: string
): Promise<void> {
  const subject = `Application Update: ${jobTitle}`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ef4444; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Update</h1>
        </div>
        <div class="content">
          <p>Hello ${candidateName},</p>
          <p>Thank you for your interest in the position <strong>${jobTitle}</strong>.</p>
          
          <div class="info-box">
            <p>After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.</p>
            ${stepName ? `<p><strong>Step:</strong> ${stepName}</p>` : ''}
          </div>

          <p>We appreciate the time you invested in the application process and encourage you to apply for other positions that may be a better fit.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification from the Recruitment Management System.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: candidateEmail,
    subject,
    html
  })
}

/**
 * Send notification email to admin about new application
 */
export async function sendAdminNewApplicationEmail(
  adminEmail: string,
  adminName: string,
  candidateName: string,
  jobTitle: string,
  jobCompany: string,
  applicationId: string
): Promise<void> {
  const subject = `New Application Received: ${jobTitle}`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Application Received</h1>
        </div>
        <div class="content">
          <p>Hello ${adminName},</p>
          <p>A new application has been submitted for review.</p>
          
          <div class="info-box">
            <h3>Application Details</h3>
            <p><strong>Candidate:</strong> ${candidateName}</p>
            <p><strong>Job Title:</strong> ${jobTitle}</p>
            <p><strong>Company:</strong> ${jobCompany}</p>
            <p><strong>Application ID:</strong> ${applicationId}</p>
          </div>

          <p>Please review the application in the admin dashboard.</p>
          
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/applications" class="button">View Application</a>
          
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification from the Recruitment Management System.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: adminEmail,
    subject,
    html
  })
}

/**
 * Send notification email when pipeline is completed
 */
export async function sendPipelineCompletionEmail(
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  jobCompany: string
): Promise<void> {
  const subject = `Congratulations! Your application for ${jobTitle} is complete`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Congratulations!</h1>
        </div>
        <div class="content">
          <p>Hello ${candidateName},</p>
          <p>Congratulations! You have successfully completed all interview steps for the position <strong>${jobTitle}</strong> at <strong>${jobCompany}</strong>.</p>
          
          <div class="success-box">
            <h3>What's Next?</h3>
            <p>Our recruitment team is currently reviewing all completed applications. We will contact you soon with the final decision.</p>
            <p>Thank you for your patience and for taking the time to participate in our recruitment process!</p>
          </div>

          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification from the Recruitment Management System.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: candidateEmail,
    subject,
    html
  })
}
