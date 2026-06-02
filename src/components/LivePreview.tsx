import React, { useState } from 'react';

interface LivePreviewProps {
  channel: 'Email' | 'SMS' | 'Both';
  subject: string;
  bodyHtml: string;
  smsBody: string;
  recipientName?: string;
  recipientEmail?: string;
}

interface EmailMockupProps {
  previewDevice: 'desktop' | 'mobile';
  recipientName: string;
  recipientEmail: string;
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
  subject,
  bodyHtml,
}) => (
  <div
    className={`email-client-frame ${previewDevice === 'mobile' ? 'mobile-frame' : 'desktop-frame'}`}
    style={{
      width: '100%',
      maxWidth: previewDevice === 'mobile' ? '375px' : '100%',
      backgroundColor: '#ffffff',
      boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
      borderRadius: previewDevice === 'mobile' ? '20px' : '0',
      border: previewDevice === 'mobile' ? '8px solid #1e293b' : 'none',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      minHeight: '550px',
    }}
  >
    <div
      style={{
        padding: '16px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        fontSize: '13px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', color: '#64748b' }}>
        <span style={{ width: '60px', fontWeight: 600 }}>From:</span>
        <span style={{ color: '#1e293b' }}>Choir Management &lt;no-reply@choir.management&gt;</span>
      </div>
      <div style={{ display: 'flex', color: '#64748b' }}>
        <span style={{ width: '60px', fontWeight: 600 }}>To:</span>
        <span style={{ color: '#1e293b' }}>
          {recipientName} &lt;{recipientEmail}&gt;
        </span>
      </div>
      <div style={{ display: 'flex', color: '#64748b', marginTop: '4px', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
        <span style={{ width: '60px', fontWeight: 600 }}>Subject:</span>
        <strong style={{ color: '#0f172a' }}>{subject || '(No Subject)'}</strong>
      </div>
    </div>

    <div
      className="email-client-body"
      style={{
        padding: previewDevice === 'mobile' ? '16px' : '24px',
        overflowY: 'auto',
        flex: 1,
        fontSize: '15px',
        lineHeight: '1.6',
        color: '#334155',
        wordBreak: 'break-word',
      }}
    >
      <div
        className="text-body message-preview-content"
        // @allow-dangerouslySetInnerHTML - bodyHtml is pre-escaped by renderMarkdown/resolvePreviewContent (use with caution)
        dangerouslySetInnerHTML={{
          __html: bodyHtml || '<p class="text-muted" style="text-align: center; padding: 40px 0;">No message content drafted yet.</p>',
        }}
      />
    </div>
  </div>
);

const SMSMockup: React.FC<SmsMockupProps> = ({ recipientName, smsBody }) => (
  <div
    style={{
      width: '100%',
      maxWidth: '350px',
      backgroundColor: '#000',
      borderRadius: '36px',
      padding: '12px',
      boxShadow: 'var(--shadow-lg)',
      border: '4px solid #334155',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '450px',
      color: '#fff',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
      <div style={{ width: '120px', height: '18px', backgroundColor: '#334155', borderRadius: '0 0 12px 12px' }}></div>
    </div>
    <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', fontSize: '12px', color: '#94a3b8' }}>
      <span>9:41</span>
      <strong style={{ color: '#f8fafc' }}>{recipientName}</strong>
      <span>100%</span>
    </div>
    <div style={{ flex: 1, padding: '16px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#151515' }}>
      <div
        style={{
          alignSelf: 'flex-start',
          backgroundColor: '#26262b',
          color: '#e5e5e7',
          padding: '10px 14px',
          borderRadius: '18px',
          maxWidth: '85%',
          fontSize: '14px',
          lineHeight: '1.4',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      >
        {smsBody || 'No SMS content drafted yet.'}
      </div>
    </div>
    <div style={{ padding: '8px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#000' }}>
      <div style={{ flex: 1, backgroundColor: '#1c1c1e', border: '1px solid #2c2c2e', borderRadius: '18px', padding: '6px 12px', fontSize: '13px', color: '#8e8e93' }}>
        iMessage
      </div>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
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
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>(
    channel === 'SMS' ? 'sms' : 'email'
  );
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="live-preview-container flex-col" style={{ gap: 'var(--space-md)' }}>
      <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="text-headline" style={{ margin: 0, fontSize: '1.1rem' }}>Live Preview</h3>
        <div className="flex-row" style={{ gap: '8px' }}>
          {channel === 'Both' && (
            <div className="flex-row" style={{ gap: '4px', backgroundColor: 'var(--bg)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'email' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', height: '30px' }}
                onClick={() => setActiveTab('email')}
              >
                Email View
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'sms' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', height: '30px' }}
                onClick={() => setActiveTab('sms')}
              >
                SMS View
              </button>
            </div>
          )}
          {activeTab === 'email' && channel !== 'SMS' && (
            <div className="flex-row" style={{ gap: '4px', backgroundColor: 'var(--bg)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                className={`btn btn-sm ${previewDevice === 'desktop' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', height: '30px' }}
                onClick={() => setPreviewDevice('desktop')}
              >
                🖥️ Desktop
              </button>
              <button
                type="button"
                className={`btn btn-sm ${previewDevice === 'mobile' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', height: '30px' }}
                onClick={() => setPreviewDevice('mobile')}
              >
                📱 Mobile
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="email-client-mockup"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md, 8px)',
          overflow: 'hidden',
          backgroundColor: '#f1f5f9',
          padding: activeTab === 'email' && previewDevice === 'mobile' ? '30px 15px' : '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {activeTab === 'email' && channel !== 'SMS' ? (
          <EmailMockup
            previewDevice={previewDevice}
            recipientName={recipientName}
            recipientEmail={recipientEmail}
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
