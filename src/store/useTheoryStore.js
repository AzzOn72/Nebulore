import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { submitUserRequest } from '../services/requestsService';

export const useTheoryStore = create(
  persist(
    (set) => ({
      submittedTheories: [],

      submitTheory: async (title, description) => {
        await submitUserRequest(title, description);

        const theory = {
          id: Date.now().toString(),
          title: title.trim(),
          description: description.trim(),
          submittedAt: new Date().toISOString(),
        };

        set((state) => ({
          submittedTheories: [theory, ...state.submittedTheories],
        }));

        return theory;
      },
    }),
    {
      name: 'nebulore-theories',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
