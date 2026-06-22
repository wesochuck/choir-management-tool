import React, { useState, useEffect } from 'react';
import type { Profile, ProfileInput } from '../../services/profileService';
import { Modal, TabGroup, Tab, TabPanel } from '../ui';
import { SingerRsvpHistoryTab } from './SingerRsvpHistoryTab';
import { SingerPatronageHistoryTab } from './SingerPatronageHistoryTab';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { useAuth } from '../../contexts/AuthContext';
import { useSingerForm } from './singer-modal/useSingerForm';
import { SingerProfileForm } from './singer-modal/SingerProfileForm';
import { SingerModalFooter } from './singer-modal/SingerModalFooter';

interface SingerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProfileInput) => Promise<void>;
  onDelete?: (profile: Profile) => Promise<void>;
  initialData?: Profile | null;
}

export const SingerModal: React.FC<SingerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
}) => {
  const { voiceParts } = useVoiceParts();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'rsvps' | 'patronage'>('profile');

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('profile');
    }
  }, [isOpen]);

  const form = useSingerForm(isOpen, initialData, onClose, onSave, onDelete);

  const isSelf = initialData?.user && user && initialData.user === user.id;
  const isAdmin = (user as Record<string, unknown>)?.role === 'admin';

  return (
    <Modal
      isOpen={isOpen}
      onClose={form.handleClose}
      title={initialData ? 'Edit Singer' : 'Add Singer'}
      maxWidth="640px"
      footer={
        <SingerModalFooter
          activeTab={activeTab}
          initialData={initialData}
          onDelete={onDelete}
          handleDelete={form.handleDelete}
          isDeleting={form.isDeleting}
          handleClose={form.handleClose}
          handleSubmit={form.handleSubmit}
          isSubmitting={form.isSubmitting}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {initialData ? (
          <TabGroup
            value={activeTab}
            onTabChange={(name) => setActiveTab(name as 'profile' | 'rsvps' | 'patronage')}
          >
            <Tab panel="profile">Profile Info</Tab>
            <Tab panel="rsvps">Performance RSVPs</Tab>
            {isAdmin && <Tab panel="patronage">Patronage</Tab>}

            <TabPanel name="profile">
              <div className="flex flex-col gap-4 pt-4">
                <SingerProfileForm
                  formData={form.formData}
                  setFormData={form.setFormData}
                  voiceParts={voiceParts}
                  initialData={initialData}
                  isSelf={isSelf}
                  emailInputRef={form.emailInputRef}
                  validateEmailField={form.validateEmailField}
                  handleEmailChange={form.handleEmailChange}
                  handleResetPassword={form.handleResetPassword}
                  resetFeedback={form.resetFeedback}
                  isResettingPassword={form.isResettingPassword}
                  handleSubmit={form.handleSubmit}
                />
              </div>
            </TabPanel>
            <TabPanel name="rsvps">
              <div className="pt-4">
                <SingerRsvpHistoryTab
                  singerId={initialData.id}
                  isOpen={isOpen}
                  isActive={activeTab === 'rsvps'}
                />
              </div>
            </TabPanel>
            {isAdmin && (
              <TabPanel name="patronage">
                <div className="pt-4">
                  <SingerPatronageHistoryTab
                    profileId={initialData.id}
                    isOpen={isOpen}
                    isActive={activeTab === 'patronage'}
                  />
                </div>
              </TabPanel>
            )}
          </TabGroup>
        ) : (
          <SingerProfileForm
            formData={form.formData}
            setFormData={form.setFormData}
            voiceParts={voiceParts}
            initialData={initialData}
            isSelf={isSelf}
            emailInputRef={form.emailInputRef}
            validateEmailField={form.validateEmailField}
            handleEmailChange={form.handleEmailChange}
            handleResetPassword={form.handleResetPassword}
            resetFeedback={form.resetFeedback}
            isResettingPassword={form.isResettingPassword}
            handleSubmit={form.handleSubmit}
          />
        )}
      </div>
    </Modal>
  );
};
