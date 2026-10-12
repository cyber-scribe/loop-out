/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CheckInScreen } from './components/CheckInScreen';
import { ResetScreen } from './components/ResetScreen';
import { SteppingAwayScreen } from './components/SteppingAwayScreen';
import { ReturnScreen } from './components/ReturnScreen';
import { AboutModal } from './components/AboutModal';
import { ResetRequest, ResetResponse, ScreenState, HealthResponse } from './types';
import { generateReset, checkHealth } from './api';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('checkin');
  const [lastRequest, setLastRequest] = useState<ResetRequest | null>(null);
  const [currentReset, setCurrentReset] = useState<ResetResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    checkHealth()
      .then((health) => setBackendHealth(health))
      .catch((err) => {
        console.warn('Backend health check error:', err);
      });
  }, []);

  const handleCheckInSubmit = async (req: ResetRequest) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLastRequest(req);

    try {
      const reset = await generateReset(req);
      setCurrentReset(reset);
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
      const reset = await generateReset(lastRequest);
      setCurrentReset(reset);
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
        onOpenAbout={() => setAboutOpen(true)}
        onResetSession={handleStartFresh}
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

      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
