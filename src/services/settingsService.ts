// Re-export all types, defaults, and functions from domain files.
// This keeps existing imports working throughout the transition.

export type { AppSetting } from './settings/core';

import {
  DEFAULT_AUDITION_SETTINGS,
  getAuditionSettings,
  saveAuditionSettings,
} from './settings/auditionSettings';
export type { AuditionSettings } from './settings/auditionSettings';
export { DEFAULT_AUDITION_SETTINGS, getAuditionSettings, saveAuditionSettings };

import {
  DEFAULT_COMMUNICATION_SETTINGS,
  getCommunicationSettings,
  saveCommunicationSettings,
} from './settings/communicationSettings';
export type { CommunicationSettings } from './settings/communicationSettings';
export { DEFAULT_COMMUNICATION_SETTINGS, getCommunicationSettings, saveCommunicationSettings };

import {
  DEFAULT_COMMUNICATION_CONFIG,
  getCommunicationConfig,
  saveCommunicationConfig,
} from './settings/communicationConfig';
export type { CommunicationConfig } from './settings/communicationConfig';
export { DEFAULT_COMMUNICATION_CONFIG, getCommunicationConfig, saveCommunicationConfig };

import { getRosterSettings, saveRosterSettings } from './settings/rosterSettings';
export type { RosterSettings } from './settings/rosterSettings';
export { getRosterSettings, saveRosterSettings };

import { getMusicLibrarySettings, saveMusicLibrarySettings } from './settings/musicLibrarySettings';
export type { MusicGenreDef, MusicLibrarySettings } from './settings/musicLibrarySettings';
export { getMusicLibrarySettings, saveMusicLibrarySettings };

import {
  DEFAULT_SECTIONS,
  DEFAULT_VOICE_PARTS,
  DEFAULT_SEATING_SETTINGS,
  getSeatingSettings,
  saveSeatingSettings,
  getVoicePartsAndSections,
  saveVoicePartsAndSections,
  getVoiceParts,
  saveVoiceParts,
} from './settings/seatingSettings';
export type {
  SectionDef,
  VoicePartDef,
  VoicePartSettings,
  FormationStrategyType,
  SeatingFormationDef,
  SeatingSettings,
} from './settings/seatingSettings';
export {
  DEFAULT_SECTIONS,
  DEFAULT_VOICE_PARTS,
  DEFAULT_SEATING_SETTINGS,
  getSeatingSettings,
  saveSeatingSettings,
  getVoicePartsAndSections,
  saveVoicePartsAndSections,
  getVoiceParts,
  saveVoiceParts,
};

import {
  DEFAULT_LANDING_SETTINGS,
  getLandingSettings,
  saveLandingSettings,
} from './settings/landingSettings';
export type { LandingPageSettings } from './settings/landingSettings';
export { DEFAULT_LANDING_SETTINGS, getLandingSettings, saveLandingSettings };

import { getHeroImageUrl, saveHeroImage, getLogoUrl, saveLogo } from './settings/landingMedia';
export { getHeroImageUrl, saveHeroImage, getLogoUrl, saveLogo };

import {
  getChoirName,
  saveChoirName,
  getPerformerLabel,
  savePerformerLabel,
  getTimezone,
  saveTimezone,
  getHomepageUrl,
  saveHomepageUrl,
} from './settings/generalSettings';
export {
  getChoirName,
  saveChoirName,
  getPerformerLabel,
  savePerformerLabel,
  getTimezone,
  saveTimezone,
  getHomepageUrl,
  saveHomepageUrl,
};

import { getPollSettings, savePollSettings } from './settings/pollSettings';
export type { PollSettings } from './settings/pollSettings';
export { getPollSettings, savePollSettings };

import {
  getTicketConfirmationPageSettings,
  saveTicketConfirmationPageSettings,
} from './settings/ticketConfirmationSettings';
export type { TicketConfirmationPageSettings } from './settings/ticketConfirmationSettings';
export { getTicketConfirmationPageSettings, saveTicketConfirmationPageSettings };

import { queueSettingsService } from './settings/queueSettings';
export { queueSettingsService };

import { getDirectorySettings, saveDirectorySettings } from './settings/directorySettings';
export type { DirectorySettings } from './settings/directorySettings';
export { getDirectorySettings, saveDirectorySettings };

import {
  getEmailProviderSettings,
  saveEmailProviderSettings,
} from './settings/emailProviderSettings';
export type { EmailProviderSettings } from './settings/emailProviderSettings';
export { getEmailProviderSettings, saveEmailProviderSettings };

// Backward compat namespace for existing settingsService.getXxx callers
export const settingsService = {
  getAuditionSettings,
  saveAuditionSettings,
  getPollSettings,
  savePollSettings,
  getCommunicationSettings,
  saveCommunicationSettings,
  getCommunicationConfig,
  saveCommunicationConfig,
  getRosterSettings,
  saveRosterSettings,
  getMusicLibrarySettings,
  saveMusicLibrarySettings,
  getSeatingSettings,
  saveSeatingSettings,
  getVoicePartsAndSections,
  saveVoicePartsAndSections,
  getChoirName,
  saveChoirName,
  getPerformerLabel,
  savePerformerLabel,
  getTimezone,
  saveTimezone,
  getHomepageUrl,
  saveHomepageUrl,
  getLandingSettings,
  saveLandingSettings,
  getHeroImageUrl,
  saveHeroImage,
  getLogoUrl,
  saveLogo,
  getDirectorySettings,
  saveDirectorySettings,
  getEmailProviderSettings,
  saveEmailProviderSettings,
};
