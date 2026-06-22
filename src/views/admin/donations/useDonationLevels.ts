import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  donationService,
  type DonationLevel,
  type DonationSettings,
} from '../../../services/donationService';

export function useDonationLevels(settings: DonationSettings | null) {
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<DonationLevel | null>(null);
  const [levelLabel, setLevelLabel] = useState('');
  const [levelAmount, setLevelAmount] = useState(0);
  const [levelBenefit, setLevelBenefit] = useState('');

  // Lifted Portal Configuration draft state
  const [portalButtonText, setPortalButtonText] = useState('');
  const [portalDescription, setPortalDescription] = useState('');
  const lastSyncedSettingsRef = useRef<DonationSettings | null>(null);

  useEffect(() => {
    if (!settings) return;

    const isFirstTime = !lastSyncedSettingsRef.current;
    const dbChanged =
      lastSyncedSettingsRef.current &&
      (lastSyncedSettingsRef.current.buttonText !== settings.buttonText ||
        lastSyncedSettingsRef.current.description !== settings.description);

    if (isFirstTime || dbChanged) {
      const isButtonTextDirty =
        lastSyncedSettingsRef.current &&
        portalButtonText !== lastSyncedSettingsRef.current.buttonText;
      const isDescriptionDirty =
        lastSyncedSettingsRef.current &&
        portalDescription !== lastSyncedSettingsRef.current.description;

      if (isFirstTime || !isButtonTextDirty) {
        setPortalButtonText(settings.buttonText);
      }
      if (isFirstTime || !isDescriptionDirty) {
        setPortalDescription(settings.description);
      }
      lastSyncedSettingsRef.current = settings;
    }
  }, [settings, portalButtonText, portalDescription]);

  const saveMutation = useMutation({
    mutationFn: (payload: DonationSettings) => donationService.saveDonationSettings(payload),
  });

  const openLevelModal = useCallback((level?: DonationLevel) => {
    if (level) {
      setEditingLevel(level);
      setLevelLabel(level.label);
      setLevelAmount(level.amount);
      setLevelBenefit(level.benefit || '');
    } else {
      setEditingLevel(null);
      setLevelLabel('');
      setLevelAmount(0);
      setLevelBenefit('');
    }
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSaveLevel = useCallback(async () => {
    const s = settingsRef.current;
    if (!s) throw new Error('Settings not loaded');
    const newLevels = editingLevel
      ? s.levels.map((l) =>
          l.id === editingLevel.id
            ? { ...l, label: levelLabel, amount: levelAmount, benefit: levelBenefit }
            : l
        )
      : [
          ...s.levels,
          {
            id: `level-${Date.now()}`,
            label: levelLabel,
            amount: levelAmount,
            benefit: levelBenefit,
          },
        ];
    return saveMutation.mutateAsync({
      ...s,
      levels: newLevels,
      buttonText: portalButtonText,
      description: portalDescription,
    });
  }, [
    editingLevel,
    levelLabel,
    levelAmount,
    levelBenefit,
    portalButtonText,
    portalDescription,
    saveMutation,
  ]);

  const handleDeleteLevel = useCallback(
    async (levelId: string) => {
      const s = settingsRef.current;
      if (!s) throw new Error('Settings not loaded');
      const newLevels = s.levels.filter((l) => l.id !== levelId);
      return saveMutation.mutateAsync({
        ...s,
        levels: newLevels,
        buttonText: portalButtonText,
        description: portalDescription,
      });
    },
    [saveMutation, portalButtonText, portalDescription]
  );

  const handleSavePublicSettings = useCallback(async () => {
    const s = settingsRef.current;
    if (!s) throw new Error('Settings not loaded');
    return saveMutation.mutateAsync({
      ...s,
      buttonText: portalButtonText,
      description: portalDescription,
    });
  }, [saveMutation, portalButtonText, portalDescription]);

  return {
    isModalOpen,
    setIsModalOpen,
    editingLevel,
    levelLabel,
    setLevelLabel,
    levelAmount,
    setLevelAmount,
    levelBenefit,
    setLevelBenefit,
    openLevelModal,
    closeModal,
    handleSaveLevel,
    handleDeleteLevel,
    handleSavePublicSettings,
    saving: saveMutation.isPending,
    portalButtonText,
    setPortalButtonText,
    portalDescription,
    setPortalDescription,
  };
}
