import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_STATE_KEY = '@uandme_tutorial_state_v1';

type TutorialState = {
  needsFirstRunTutorial: boolean;
  completedAt?: number | null;
};

const DEFAULT_STATE: TutorialState = {
  needsFirstRunTutorial: false,
  completedAt: null,
};

const QUEUED_STATE: TutorialState = {
  needsFirstRunTutorial: true,
  completedAt: null,
};

class TutorialService {
  private async read(): Promise<TutorialState> {
    try {
      const raw = await AsyncStorage.getItem(TUTORIAL_STATE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  private async write(next: TutorialState): Promise<void> {
    await AsyncStorage.setItem(TUTORIAL_STATE_KEY, JSON.stringify(next));
  }

  async queueFirstRunTutorial(): Promise<void> {
    const state = await this.read();
    await this.write({ ...state, needsFirstRunTutorial: true });
  }

  async shouldShowFirstRunTutorial(): Promise<boolean> {
    const state = await this.read();
    return !!state.needsFirstRunTutorial;
  }

  async completeFirstRunTutorial(): Promise<void> {
    await this.write({ needsFirstRunTutorial: false, completedAt: Date.now() });
  }

  async resetTutorial(): Promise<void> {
    await this.write({ needsFirstRunTutorial: true, completedAt: null });
  }
}

export default new TutorialService();
