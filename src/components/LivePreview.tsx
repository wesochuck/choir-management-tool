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
    className={`flex min-h-[550px] w-full flex-col bg-surface shadow-md transition-all duration-300 ${previewDevice === 'mobile' ? 'max-w-[375px] rounded-[20px] border-8 border-slate-800' : 'max-w-full rounded-none border-0'}`}
  >
    <div className="flex flex-col gap-1.5 border-b border-border bg-[#f8fafc] p-4 text-xs">
      <div className="flex text-text-muted">
        <span className="w-[60px] shrink-0 font-semibold">From:</span>
        <span className="text-slate-800">
          {senderName} &lt;{senderEmail}&gt;
        </span>
      </div>
      <div className="flex text-text-muted">
        <span className="w-[60px] shrink-0 font-semibold">To:</span>
        <span className="text-slate-800">
          {recipientName} &lt;{recipientEmail}&gt;
        </span>
      </div>
      <div className="mt-1 flex border-t border-dashed border-border pt-1.5 text-text-muted">
        <span className="w-[60px] shrink-0 font-semibold">Subject:</span>
        <strong className="text-slate-900">{subject || '(No Subject)'}</strong>
      </div>
    </div>

    <div className={`flex-1 overflow-y-auto text-sm leading-relaxed break-words text-slate-600 ${previewDevice === 'mobile' ? 'p-4' : 'p-6'}`}>
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
  <div className="flex min-h-[450px] w-full max-w-[350px] flex-col rounded-[36px] border-4 border-slate-600 bg-black p-3 text-white shadow-lg">
    <div className="mb-2 flex justify-center">
      <div className="h-[18px] w-[120px] rounded-b-xl bg-slate-600"></div>
    </div>
    <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-xs text-slate-400">
      <span>9:41</span>
      <strong className="font-bold text-[#f8fafc]">{recipientName}</strong>
      <span>100%</span>
    </div>
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-[#151515] p-4">
      <div className="max-w-[85%] self-start rounded-[18px] bg-[#26262b] px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-[#e5e5e7]">
        {smsBody || 'No SMS content drafted yet.'}
      </div>
    </div>
    <div className="flex items-center gap-2 border-t border-slate-800 bg-black p-2">
      <div className="flex-1 rounded-[18px] border border-[#2c2c2e] bg-[#1c1c1e] px-3 py-1.5 text-xs text-[#8e8e93]">
        iMessage
      </div>
      <div className="flex size-7 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
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
      <div className="flex items-center justify-between">
        <h3 className="text-headline m-0 text-lg">Live Preview</h3>
        <div className="flex gap-2">
          {channel === 'Both' && (
            <div className="flex gap-1 rounded-md border border-border bg-bg p-0.5">
              <button
                type="button"
                className={`btn btn-sm h-[30px] px-2.5 py-1 ${activeTab === 'email' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('email')}
              >
                Email View
              </button>
              <button
                type="button"
                className={`btn btn-sm h-[30px] px-2.5 py-1 ${activeTab === 'sms' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('sms')}
              >
                SMS View
              </button>
            </div>
          )}
          {activeTab === 'email' && channel !== 'SMS' && (
            <div className="flex gap-1 rounded-md border border-border bg-bg p-0.5">
              <button
                type="button"
                className={`btn btn-sm h-[30px] px-2.5 py-1 ${previewDevice === 'desktop' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setPreviewDevice('desktop')}
              >
                🖥️ Desktop
              </button>
              <button
                type="button"
                className={`btn btn-sm h-[30px] px-2.5 py-1 ${previewDevice === 'mobile' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setPreviewDevice('mobile')}
              >
                📱 Mobile
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className={`flex items-center justify-center overflow-hidden rounded-md border border-border bg-[var(--primary-light,#f1f5f9)] transition-all duration-300 ${activeTab === 'email' && previewDevice === 'mobile' ? 'px-[15px] py-[30px]' : 'p-5'}`}
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
