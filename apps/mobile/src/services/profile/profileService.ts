import { USE_MOCK_API } from '../../constants';
import type { Profile, ProfileUpdate } from '../../types/api';
import { api } from '../api/client';

let mockProfile: Profile = {
  id: 'mock',
  display_name: null,
  birth_year: null,
  age_range: null,
  gender: null,
  country: 'SE',
  skin_tone: null,
  skin_type: 'unknown',
  consent_images: false,
  consent_at: null,
  locale: 'sv',
};

export const profileService = {
  async get(): Promise<Profile> {
    if (USE_MOCK_API) return mockProfile;
    return api.get<Profile>('/profile');
  },
  async update(patch: ProfileUpdate): Promise<Profile> {
    if (USE_MOCK_API) {
      mockProfile = { ...mockProfile, ...patch, consent_at: patch.consent_images ? new Date().toISOString() : mockProfile.consent_at };
      return mockProfile;
    }
    return api.put<Profile>('/profile', patch);
  },
  async deleteAllData(): Promise<void> {
    if (USE_MOCK_API) return;
    await api.delete('/profile');
  },
};
