import React, { useState } from 'react';
import './LivePreview.css';

interface LivePreviewProps {
  channel: 'Email' | 'SMS' | 'Both';
  subject: string;
  bodyHtml: string;
  smsBody: string;
  recipientName?: string;
  recipientEmail?: string;
  senderName?: string;
  senderEmail?: string;
}

interface EmailMockupProps {
  previewDevice: 'desktop' | 'mobile';
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  bodyHtml: string;
}

interface SmsMockupProps {
  recipientName: string;
  smsBody: string;
}

const EmailMockup: React.FC<EmailMockupProps> = ({
  previewDevice,
  recipientName,
  recipientEmail,
  senderName,
  senderEmail,
  subject,
  bodyHtml,
}) => (
  <div
    className={`email-client-frame preview-email-frame ${previewDevice === 'mobile' ? 'mobile-frame' : 'desktop-frame'}`}
  >
    <div className="preview-email-header">
      <div className="preview-email-header-row">
        <span className="preview-email-label">From:</span>
        <span className="preview-email-value">
          {senderName} &lt;{senderEmail}&gt;
        </span>
      </div>
      <div className="preview-email-header-row">
        <span className="preview-email-label">To:</span>
        <span className="preview-email-value">
          {recipientName} &lt;{recipientEmail}&gt;
        </span>
      </div>
      <div className="preview-email-subject-row">
        <span className="preview-email-label">Subject:</span>
        <strong className="preview-email-subject-value">{subject || '(No Subject)'}</strong>
      </div>
    </div>

    <div className="email-client-body preview-email-body">
      <div
        className="text-body message-preview-content"
        // @allow-dangerouslySetInnerHTML - bodyHtml is pre-escaped by renderMarkdown/resolvePreviewContent (use with caution)
        dangerouslySetInnerHTML={{
          __html: bodyHtml || '<p class="text-muted preview-empty-state">No message content drafted yet.</p>',
        }}
      />
    </div>
  </div>
);

const SMSMockup: React.FC<SmsMockupProps> = ({ recipientName, smsBody }) => (
  <div className="preview-sms-frame">
    <div className="preview-sms-notch-container">
      <div className="preview-sms-notch"></div>
    </div>
    <div className="preview-sms-header">
      <span>9:41</span>
      <strong className="preview-sms-recipient">{recipientName}</strong>
      <span>100%</span>
    </div>
    <div className="preview-sms-body">
      <div className="preview-sms-bubble">
        {smsBody || 'No SMS content drafted yet.'}
      </div>
    </div>
    <div className="preview-sms-footer">
      <div className="preview-sms-input">
        iMessage
      </div>
      <div className="preview-sms-send">
        ↑
      </div>
    </div>
  </div>
);

export const LivePreview: React.FC<LivePreviewProps> = ({
  channel,
  subject,
  bodyHtml,
  smsBody,
  recipientName = 'Active Choir Members',
  recipientEmail = 'singers@yourchoir.org',
  senderName = 'Choir Management',
  senderEmail = 'no-reply@choir.management',
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>(
    channel === 'SMS' ? 'sms' : 'email'
  );
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="live-preview-container flex-col preview-container">
      <div className="flex-row preview-header">
        <h3 className="text-headline preview-title">Live Preview</h3>
        <div className="flex-row preview-controls">
          {channel === 'Both' && (
            <div className="flex-row preview-toggle-group">
              <button
                type="button"
                className={`btn btn-sm preview-toggle-btn ${activeTab === 'email' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('email')}
              >
                Email View
              </button>
              <button
                type="button"
                className={`btn btn-sm preview-toggle-btn ${activeTab === 'sms' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('sms')}
              >
                SMS View
              </button>
            </div>
          )}
          {activeTab === 'email' && channel !== 'SMS' && (
            <div className="flex-row preview-toggle-group">
              <button
                type="button"
                className={`btn btn-sm preview-toggle-btn ${previewDevice === 'desktop' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setPreviewDevice('desktop')}
              >
                🖥️ Desktop
              </button>
              <button
                type="button"
                className={`btn btn-sm preview-toggle-btn ${previewDevice === 'mobile' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setPreviewDevice('mobile')}
              >
                📱 Mobile
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className={`email-client-mockup preview-mockup-container ${activeTab === 'email' && previewDevice === 'mobile' ? 'mobile-padding' : ''}`}
      >
        {activeTab === 'email' && channel !== 'SMS' ? (
          <EmailMockup
            previewDevice={previewDevice}
            recipientName={recipientName}
            recipientEmail={recipientEmail}
            senderName={senderName}
            senderEmail={senderEmail}
            subject={subject}
            bodyHtml={bodyHtml}
          />
        ) : (
          <SMSMockup recipientName={recipientName} smsBody={smsBody} />
        )}
      </div>
    </div>
  );
};
