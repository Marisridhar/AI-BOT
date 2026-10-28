import nodemailer from 'nodemailer';
import env from '../config/env.js';
import EmailLog from '../models/EmailLog.js';
import TaskRun from '../models/TaskRun.js';

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class EmailService {
  constructor(transporter = null) {
    this._transporter = transporter;
  }

  getTransporter() {
    if (this._transporter) {
      return this._transporter;
    }

    if (!env.isEmailConfigured()) {
      return null;
    }

    const transportOptions = {
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_SECURE,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS
      }
    };

    // If host is gmail or user ends with @gmail.com and no custom host is provided, use service: 'gmail'
    if (env.EMAIL_HOST === 'smtp.gmail.com' || (!env.EMAIL_HOST && env.EMAIL_USER.includes('@gmail.com'))) {
      transportOptions.service = 'gmail';
      delete transportOptions.host;
      delete transportOptions.port;
    }

    this._transporter = nodemailer.createTransport(transportOptions);
    return this._transporter;
  }

  async _sendWithTracking({ eventKey, taskRunId, submissionId = null, emailType, recipient, subject, text, html }) {
    // 1. Check or create EmailLog
    let emailLog = await EmailLog.findOne({ eventKey });
    if (emailLog && emailLog.status === 'sent') {
      console.log(`[EmailService] Email with eventKey ${eventKey} was already sent. Skipping.`);
      return { success: true, emailLog, skipped: true };
    }

    if (!emailLog) {
      emailLog = new EmailLog({
        eventKey,
        taskRunId,
        submissionId,
        emailType,
        recipient,
        status: 'pending',
        attemptCount: 0
      });
      await emailLog.save();
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      const errorMsg = 'Email service is not configured. Missing SMTP credentials.';
      emailLog.status = 'failed';
      emailLog.attemptCount += 1;
      emailLog.lastError = errorMsg;
      await emailLog.save();

      await TaskRun.findByIdAndUpdate(taskRunId, {
        emailDeliveryStatus: 'failed',
        emailFailureMetadata: { error: errorMsg, attemptedAt: new Date() }
      });

      console.warn(`[EmailService] ${errorMsg}`);
      return { success: false, error: errorMsg, emailLog };
    }

    try {
      emailLog.attemptCount += 1;
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: recipient,
        subject,
        text,
        html
      });

      emailLog.status = 'sent';
      emailLog.sentAt = new Date();
      emailLog.lastError = null;
      await emailLog.save();

      await TaskRun.findByIdAndUpdate(taskRunId, {
        emailDeliveryStatus: 'sent',
        emailFailureMetadata: null
      });

      console.log(`[EmailService] Successfully delivered "${emailType}" email to ${recipient}`);
      return { success: true, emailLog };
    } catch (err) {
      const errorMsg = err.message || 'SMTP delivery failed';
      console.error(`[EmailService] Delivery failed for ${eventKey}: ${errorMsg}`);

      emailLog.status = 'failed';
      emailLog.lastError = errorMsg;
      await emailLog.save();

      await TaskRun.findByIdAndUpdate(taskRunId, {
        emailDeliveryStatus: 'failed',
        emailFailureMetadata: { error: errorMsg, attemptedAt: new Date() }
      });

      return { success: false, error: errorMsg, emailLog };
    }
  }

  async sendAssignmentEmail({ taskRun, assignment, rawToken }) {
    const portalUrl = `${env.FRONTEND_BASE_URL}/task/${taskRun._id}?token=${rawToken}`;
    const safeTitle = escapeHtml(assignment.title);
    const safeStudent = escapeHtml(taskRun.studentName);
    const safeScenario = escapeHtml(assignment.scenarioText);

    const subject = `New Assignment: ${assignment.title}`;
    const text = `Hello ${taskRun.studentName},\n\nYou have been assigned a new project: "${assignment.title}".\n\nScenario Brief:\n${assignment.scenarioText}\n\nAccess your student portal to review the scenario and begin your work:\n${portalUrl}\n\nBest regards,\nAI Bot Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #1a73e8; margin-top: 0;">New Assignment: ${safeTitle}</h2>
        <p>Hello <strong>${safeStudent}</strong>,</p>
        <p>You have been assigned a new project challenge.</p>
        <div style="background-color: #f8f9fa; border-left: 4px solid #1a73e8; padding: 12px 16px; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0; color: #202124;">Scenario Brief</h4>
          <p style="margin: 0; white-space: pre-line;">${safeScenario}</p>
        </div>
        <p style="margin: 24px 0;">
          <a href="${portalUrl}" style="background-color: #1a73e8; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
            Open Assignment Portal
          </a>
        </p>
        <p style="font-size: 13px; color: #666;">Or open this link directly in your browser:<br/><a href="${portalUrl}">${portalUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #888;">AI Bot Automated Assignment System</p>
      </div>
    `;

    return this._sendWithTracking({
      eventKey: `assignment_${taskRun._id}`,
      taskRunId: taskRun._id,
      emailType: 'assignment',
      recipient: taskRun.studentEmail,
      subject,
      text,
      html
    });
  }

  async sendReviewEmail({ taskRun, assignment, submission, review }) {
    const safeTitle = escapeHtml(assignment.title);
    const safeStudent = escapeHtml(taskRun.studentName);
    const safeSummary = escapeHtml(review.summary);
    const safeVerdict = escapeHtml(review.verdict.toUpperCase());

    const strengthsListHtml = (review.strengths || [])
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join('');
    const issuesListHtml = (review.issues || [])
      .map(
        (iss) =>
          `<li style="margin-bottom: 8px;"><strong>[${escapeHtml(iss.severity.toUpperCase())}] ${escapeHtml(iss.criterion)}:</strong> ${escapeHtml(iss.suggestion)}<br/><span style="font-size: 12px; color: #666;">Evidence: ${escapeHtml(iss.evidence)}</span></li>`
      )
      .join('');
    const nextStepsListHtml = (review.nextSteps || [])
      .map((step) => `<li>${escapeHtml(step)}</li>`)
      .join('');

    const subject = `Project Review Results: ${assignment.title} (Score: ${review.score}/100)`;
    const text = `Hello ${taskRun.studentName},\n\nYour submission for "${assignment.title}" has been reviewed!\n\nScore: ${review.score}/100\nVerdict: ${review.verdict.toUpperCase()}\nSummary: ${review.summary}\n\nStrengths:\n${(review.strengths || []).map((s) => `- ${s}`).join('\n')}\n\nIssues & Suggestions:\n${(review.issues || []).map((i) => `[${i.severity.toUpperCase()}] ${i.criterion}: ${i.suggestion} (Evidence: ${i.evidence})`).join('\n')}\n\nNext Steps:\n${(review.nextSteps || []).map((n) => `- ${n}`).join('\n')}\n\nBest regards,\nAI Bot Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #1a73e8; margin-top: 0;">Evaluation Report: ${safeTitle}</h2>
        <p>Hello <strong>${safeStudent}</strong>,</p>
        <div style="background-color: #f1f3f4; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #202124;">Score: <span style="color: ${review.score >= 70 ? '#1e8e3e' : review.score >= 50 ? '#f9ab00' : '#d93025'}; font-size: 26px;">${review.score}/100</span> (Verdict: ${safeVerdict})</h3>
          <p style="margin: 0; color: #444;">${safeSummary}</p>
        </div>
        ${
          strengthsListHtml
            ? `<h4 style="color: #1e8e3e; margin-bottom: 6px;">Key Strengths</h4><ul>${strengthsListHtml}</ul>`
            : ''
        }
        ${
          issuesListHtml
            ? `<h4 style="color: #d93025; margin-bottom: 6px;">Identified Areas for Improvement</h4><ul style="padding-left: 20px;">${issuesListHtml}</ul>`
            : ''
        }
        ${
          nextStepsListHtml
            ? `<h4 style="color: #1a73e8; margin-bottom: 6px;">Recommended Next Steps</h4><ul>${nextStepsListHtml}</ul>`
            : ''
        }
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #888;">AI Bot Automated Evaluation System</p>
      </div>
    `;

    return this._sendWithTracking({
      eventKey: `review_${submission._id}`,
      taskRunId: taskRun._id,
      submissionId: submission._id,
      emailType: 'review',
      recipient: taskRun.studentEmail,
      subject,
      text,
      html
    });
  }

  async sendNextAssignmentEmail({ taskRun, assignment, rawToken }) {
    const portalUrl = `${env.FRONTEND_BASE_URL}/task/${taskRun._id}?token=${rawToken}`;
    const safeTitle = escapeHtml(assignment.title);
    const safeStudent = escapeHtml(taskRun.studentName);
    const safeScenario = escapeHtml(assignment.scenarioText);

    const subject = `Next Project Unlocked: ${assignment.title}`;
    const text = `Congratulations ${taskRun.studentName}!\n\nYou have unlocked the next assignment in your learning path: "${assignment.title}".\n\nScenario Brief:\n${assignment.scenarioText}\n\nAccess your new assignment here:\n${portalUrl}\n\nBest regards,\nAI Bot Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #1e8e3e; margin-top: 0;">Next Challenge Unlocked: ${safeTitle}</h2>
        <p>Congratulations <strong>${safeStudent}</strong>,</p>
        <p>Based on your progress, the next assignment in your track is now active.</p>
        <div style="background-color: #f8f9fa; border-left: 4px solid #1e8e3e; padding: 12px 16px; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0; color: #202124;">Scenario Brief</h4>
          <p style="margin: 0; white-space: pre-line;">${safeScenario}</p>
        </div>
        <p style="margin: 24px 0;">
          <a href="${portalUrl}" style="background-color: #1e8e3e; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
            Start Next Assignment
          </a>
        </p>
        <p style="font-size: 13px; color: #666;">Direct link:<br/><a href="${portalUrl}">${portalUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #888;">AI Bot Automated Assignment System</p>
      </div>
    `;

    return this._sendWithTracking({
      eventKey: `next_assignment_${taskRun._id}`,
      taskRunId: taskRun._id,
      emailType: 'next_assignment',
      recipient: taskRun.studentEmail,
      subject,
      text,
      html
    });
  }

  async sendInvitationEmail({ user, course, rawToken }) {
    const inviteUrl = `${env.FRONTEND_BASE_URL}/accept-invitation?token=${rawToken}`;
    const safeTitle = escapeHtml(course.title);
    const safeName = escapeHtml(user.name);
    const safeDesc = escapeHtml(course.description || '');

    const subject = `Invitation to enroll: ${course.title}`;
    const text = `Hello ${user.name},\n\nYou have been invited to enroll in "${course.title}".\n\n${course.description}\n\nAccept your invitation and get started here:\n${inviteUrl}\n\nBest regards,\nAI Bot Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #1a73e8; margin-top: 0;">Course Invitation: ${safeTitle}</h2>
        <p>Hello <strong>${safeName}</strong>,</p>
        <p>You have been invited to participate in an AI-assisted course.</p>
        ${safeDesc ? `<p style="color: #555;">${safeDesc}</p>` : ''}
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}" style="background-color: #1a73e8; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
            Accept Invitation &amp; Start Learning
          </a>
        </p>
        <p style="font-size: 13px; color: #666;">Or copy this link:<br/><a href="${inviteUrl}">${inviteUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #888;">AI Bot Learning Platform</p>
      </div>
    `;

    return this._sendWithTracking({
      eventKey: `invitation_${course._id}_${user._id}`,
      taskRunId: null,
      emailType: 'invitation',
      recipient: user.email,
      subject,
      text,
      html
    });
  }
}

export const emailService = new EmailService();
export default emailService;

