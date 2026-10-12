import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CheckInScreen } from './components/CheckInScreen';
import { ResetScreen } from './components/ResetScreen';
import { SteppingAwayScreen } from './components/SteppingAwayScreen';
import { ReturnScreen } from './components/ReturnScreen';
import { ResetRequest, ResetResponse, ScreenState, HealthResponse, ThemeMode } from './types';
import { generateReset, checkHealth } from './api';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('checkin');
  const [lastRequest, setLastRequest] = useState<ResetRequest | null>(null);
  const [currentReset, setCurrentReset] = useState<ResetResponse | null>(null);
  const [shownActivityTitles, setShownActivityTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  );

  useEffect(() => {
    checkHealth()
      .then((health) => setBackendHealth(health))
      .catch((err) => {
        console.warn('Backend health check error:', err);
      });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#171923' : '#faf8f5',
    );
    try {
      localStorage.setItem('loopout-theme', theme);
    } catch {
      // Theme still works for this visit when storage is unavailable.
    }
  }, [theme]);

  const handleCheckInSubmit = async (req: ResetRequest) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLastRequest(req);
    setShownActivityTitles([]);

    try {
      const reset = await generateReset(req);
      setCurrentReset(reset);
      setShownActivityTitles([reset.activity_title]);
      setScreen('reset');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong while connecting to the reset generator.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChooseAnother = async (): Promise<boolean> => {
    if (!lastRequest) {
      setScreen('checkin');
      return false;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const excludedActivityTitles = Array.from(
        new Set([
          ...shownActivityTitles,
          ...(currentReset ? [currentReset.activity_title] : []),
        ]),
      ).slice(-20);
      const reset = await generateReset({
        ...lastRequest,
        excluded_activity_titles: excludedActivityTitles,
      });
      setCurrentReset(reset);
      setShownActivityTitles((shown) =>
        Array.from(new Set([...shown, ...excludedActivityTitles, reset.activity_title])).slice(-20),
      );
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate an alternative reset.';
      setErrorMessage(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepAway = () => {
    setScreen('stepping_away');
  };

  const handleReturnedFromOffline = () => {
    setScreen('return');
  };

  const handleStartFresh = () => {
    setCurrentReset(null);
    setLastRequest(null);
    setShownActivityTitles([]);
    setErrorMessage(null);
    setScreen('checkin');
  };

  const handleRequestAnotherReset = async () => {
    if (!lastRequest) {
      handleStartFresh();
      return;
    }
    const ok = await handleChooseAnother();
    if (ok) setScreen('reset');
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-highlight selection:text-ink-strong">
      <Header
        onResetSession={handleStartFresh}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
      />

      <main className="flex-1 flex flex-col justify-center">
        {screen === 'checkin' && (
          <CheckInScreen
            onSubmit={handleCheckInSubmit}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        )}

        {screen === 'reset' && currentReset && (
          <ResetScreen
            reset={currentReset}
            onStepAway={handleStepAway}
            onChooseAnother={handleChooseAnother}
            isLoadingAnother={isLoading}
          />
        )}

        {screen === 'stepping_away' && currentReset && (
          <SteppingAwayScreen
            activityTitle={currentReset.activity_title}
            onReturn={handleReturnedFromOffline}
          />
        )}

        {screen === 'return' && (
          <ReturnScreen
            onStartFresh={handleStartFresh}
            onRequestAnotherReset={handleRequestAnotherReset}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        )}
      </main>
    </div>
  );
}
