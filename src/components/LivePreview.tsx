import React, { useState } from 'react';

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
    className={`w-full bg-surface shadow-md flex flex-col transition-all duration-300 min-h-[550px] ${previewDevice === 'mobile' ? 'max-w-[375px] rounded-[20px] border-8 border-slate-800' : 'max-w-full rounded-none border-0'}`}
  >
    <div className="p-4 border-b border-border bg-[#f8fafc] text-xs flex flex-col gap-1.5">
      <div className="flex text-text-muted">
        <span className="w-[60px] font-semibold shrink-0">From:</span>
        <span className="text-slate-800">
          {senderName} &lt;{senderEmail}&gt;
        </span>
      </div>
      <div className="flex text-text-muted">
        <span className="w-[60px] font-semibold shrink-0">To:</span>
        <span className="text-slate-800">
          {recipientName} &lt;{recipientEmail}&gt;
        </span>
      </div>
      <div className="flex text-text-muted mt-1 border-t border-dashed border-border pt-1.5">
        <span className="w-[60px] font-semibold shrink-0">Subject:</span>
        <strong className="text-slate-900">{subject || '(No Subject)'}</strong>
      </div>
    </div>

    <div className={`overflow-y-auto flex-1 text-sm leading-relaxed text-slate-600 break-words ${previewDevice === 'mobile' ? 'p-4' : 'p-6'}`}>
      <div
        className="text-body message-preview-content"
        // @allow-dangerouslySetInnerHTML - bodyHtml is pre-escaped by renderMarkdown/resolvePreviewContent (use with caution)
        dangerouslySetInnerHTML={{
          __html: bodyHtml || '<p class="text-text-muted text-center py-10">No message content drafted yet.</p>',
        }}
      />
    </div>
  </div>
);

const SMSMockup: React.FC<SmsMockupProps> = ({ recipientName, smsBody }) => (
  <div className="w-full max-w-[350px] bg-black rounded-[36px] p-3 shadow-lg border-4 border-slate-600 flex flex-col min-h-[450px] text-white">
    <div className="flex justify-center mb-2">
      <div className="w-[120px] h-[18px] bg-slate-600 rounded-b-xl"></div>
    </div>
    <div className="px-4 py-2 flex justify-between items-center border-b border-slate-800 text-xs text-slate-400">
      <span>9:41</span>
      <strong className="text-[#f8fafc] font-bold">{recipientName}</strong>
      <span>100%</span>
    </div>
    <div className="flex-1 px-4 py-4 overflow-y-auto flex flex-col gap-2 bg-[#151515]">
      <div className="self-start bg-[#26262b] text-[#e5e5e7] px-3.5 py-2.5 rounded-[18px] max-w-[85%] text-sm leading-relaxed break-words whitespace-pre-wrap">
        {smsBody || 'No SMS content drafted yet.'}
      </div>
    </div>
    <div className="p-2 border-t border-slate-800 flex items-center gap-2 bg-black">
      <div className="flex-1 bg-[#1c1c1e] border border-[#2c2c2e] rounded-[18px] px-3 py-1.5 text-xs text-[#8e8e93]">
        iMessage
      </div>
      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
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
    <div className="live-preview-container flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-headline m-0 text-lg">Live Preview</h3>
        <div className="flex gap-2">
          {channel === 'Both' && (
            <div className="flex gap-1 border border-border rounded-md bg-bg p-0.5">
              <button
                type="button"
                className={`btn btn-sm px-2.5 py-1 h-[30px] ${activeTab === 'email' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('email')}
              >
                Email View
              </button>
              <button
                type="button"
                className={`btn btn-sm px-2.5 py-1 h-[30px] ${activeTab === 'sms' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('sms')}
              >
                SMS View
              </button>
            </div>
          )}
          {activeTab === 'email' && channel !== 'SMS' && (
            <div className="flex gap-1 border border-border rounded-md bg-bg p-0.5">
              <button
                type="button"
                className={`btn btn-sm px-2.5 py-1 h-[30px] ${previewDevice === 'desktop' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setPreviewDevice('desktop')}
              >
                🖥️ Desktop
              </button>
              <button
                type="button"
                className={`btn btn-sm px-2.5 py-1 h-[30px] ${previewDevice === 'mobile' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setPreviewDevice('mobile')}
              >
                📱 Mobile
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className={`border border-border rounded-md overflow-hidden bg-[var(--primary-light,#f1f5f9)] flex justify-center items-center transition-all duration-300 ${activeTab === 'email' && previewDevice === 'mobile' ? 'px-[15px] py-[30px]' : 'p-5'}`}
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
