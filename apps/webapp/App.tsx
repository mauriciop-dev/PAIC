import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Chatbot from './components/Chatbot';
import DraggableChatButton from './components/DraggableChatButton';
import HelpModal from './components/HelpModal';
import InitialSetupModal from './components/InitialSetupModal';
import SettingsModal from './components/SettingsModal';
import LoginView from './components/views/LoginView';
import SuperAdminDashboard from './components/views/SuperAdminDashboard';
import KioskSecurityView from './components/views/KioskSecurityView';
import { Tab, UserProfile, ConjuntoInfo, UserRole, SuperAdminProfile, PackageLog, PlatformUser } from './types';
import { Icon, ToastProvider, useToast } from '@paic/ui';
import AccessPointSelectionModal from './components/AccessPointSelectionModal';
import { apiService } from './services/apiService';
import {
  setWriteAccessProvider,
  supabase,
  TRIAL_WRITE_BLOCKED_EVENT,
  TRIAL_WRITE_BLOCKED_MESSAGE,
} from './services/supabaseClient';
import usePWAServiceWorker from './hooks/usePWAServiceWorker';

import { fromSupabase } from './utils/dbMappers';
import { Session } from '@supabase/supabase-js';
import OnboardingGuide from './components/OnboardingGuide';
import OnboardingModal from './components/OnboardingModal';
import DetailedOnboarding from './components/DetailedOnboarding';
import BottomNav from './components/BottomNav';
import { useOnboardingProgress } from './hooks/useOnboardingProgress';
import { analytics } from './services/analytics';
import { getPendingPlan, clearPendingPlan } from './components/PlansModal';
import {
  canWriteForAccount,
  isReadOnlyAccount,
  TRIAL_DEMO_EMAIL,
} from './services/trialAccess';