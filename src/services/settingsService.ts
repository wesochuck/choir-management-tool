// Re-export all types, defaults, and functions from domain files.
// This keeps existing imports working throughout the transition.

import { getSetting, upsertSetting } from './settings/core';
export { getSetting, upsertSetting };
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

import {
  DEFAULT_ROSTER_SETTINGS,
  getRosterSettings,
  saveRosterSettings,
} from './settings/rosterSettings';
export type { RosterSettings } from './settings/rosterSettings';
export { DEFAULT_ROSTER_SETTINGS, getRosterSettings, saveRosterSettings };

import {
  DEFAULT_MUSIC_LIBRARY_SETTINGS,
  getMusicLibrarySettings,
  saveMusicLibrarySettings,
} from './settings/musicLibrarySettings';
export type { MusicGenreDef, MusicLibrarySettings } from './settings/musicLibrarySettings';
export { DEFAULT_MUSIC_LIBRARY_SETTINGS, getMusicLibrarySettings, saveMusicLibrarySettings };

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
  getTimezone,
  saveTimezone,
  getHomepageUrl,
  saveHomepageUrl,
} from './settings/generalSettings';
export { getChoirName, saveChoirName, getTimezone, saveTimezone, getHomepageUrl, saveHomepageUrl };

import { DEFAULT_POLL_SETTINGS, getPollSettings, savePollSettings } from './settings/pollSettings';
export type { PollSettings } from './settings/pollSettings';
export { DEFAULT_POLL_SETTINGS, getPollSettings, savePollSettings };

import {
  DEFAULT_TICKET_CONFIRMATION_SETTINGS,
  getTicketConfirmationPageSettings,
  saveTicketConfirmationPageSettings,
} from './settings/ticketConfirmationSettings';
export type { TicketConfirmationPageSettings } from './settings/ticketConfirmationSettings';
export {
  DEFAULT_TICKET_CONFIRMATION_SETTINGS,
  getTicketConfirmationPageSettings,
  saveTicketConfirmationPageSettings,
};

import { queueSettingsService } from './settings/queueSettings';
export { queueSettingsService };

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
  getChoirName,
  saveChoirName,
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
};
