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
    return saveMutation.mutateAsync({ ...s, levels: newLevels });
  }, [editingLevel, levelLabel, levelAmount, levelBenefit, saveMutation]);

  const handleDeleteLevel = useCallback(
    async (levelId: string) => {
      const s = settingsRef.current;
      if (!s) throw new Error('Settings not loaded');
      const newLevels = s.levels.filter((l) => l.id !== levelId);
      return saveMutation.mutateAsync({ ...s, levels: newLevels });
    },
    [saveMutation]
  );

  const handleSavePublicSettings = useCallback(
    async (buttonText: string, description: string) => {
      const s = settingsRef.current;
      if (!s) throw new Error('Settings not loaded');
      return saveMutation.mutateAsync({ ...s, buttonText, description });
    },
    [saveMutation]
  );

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
  };
}
